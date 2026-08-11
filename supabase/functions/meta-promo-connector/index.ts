import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type QueueItem = {
  id?: string;
  channel?: string;
  title?: string;
  copy?: string;
  status?: string;
  imageUrl?: string;
  mediaUrl?: string;
  videoUrl?: string;
  publicMediaUrl?: string;
};

type PublishPayload = {
  action?: string;
  item?: QueueItem;
  event?: Record<string, unknown>;
  mediaUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const graphVersion = Deno.env.get("META_GRAPH_VERSION") || "v26.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

function env(name: string): string {
  return Deno.env.get(name) || "";
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}

function missingSecrets(): string[] {
  return [
    ["META_ACCESS_TOKEN", env("META_ACCESS_TOKEN")],
    ["META_IG_USER_ID", env("META_IG_USER_ID")],
  ].filter(([, value]) => !value).map(([name]) => name);
}

function publicCopy(rawCopy = ""): string {
  return rawCopy
    .replace(/^PUBLIC COPY:\s*/i, "")
    .split(/\n\s*PRODUCTION NOTES:\s*/i)[0]
    .trim();
}

function mediaUrlFrom(payload: PublishPayload): string {
  const item = payload.item || {};
  return item.publicMediaUrl || item.mediaUrl || item.imageUrl || item.videoUrl || payload.mediaUrl || payload.imageUrl || payload.videoUrl || "";
}

function targetFrom(item: QueueItem): "facebook" | "instagram" | "unsupported" {
  const channel = String(item.channel || "").toLowerCase();
  if (channel.includes("facebook")) return "facebook";
  if (channel.includes("instagram")) return "instagram";
  return "unsupported";
}

async function graphGet(path: string): Promise<Response> {
  return await fetch(`${graphBase}/${path}`);
}

async function graphPost(path: string, params: URLSearchParams): Promise<Response> {
  return await fetch(`${graphBase}/${path}`, {
    method: "POST",
    body: params,
  });
}

async function readMetaResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_) {
    return { message: text };
  }
}

async function statusCheck(): Promise<Response> {
  const missing = missingSecrets();
  if (missing.length) {
    return json({
      status: "missing_config",
      message: `Connector deployed, but missing Supabase secret(s): ${missing.join(", ")}.`,
      requiredSecrets: [
        "META_ACCESS_TOKEN",
        "META_IG_USER_ID",
        "META_PAGE_ACCESS_TOKEN optional",
        "META_FACEBOOK_PAGE_ID optional",
        "META_PUBLISH_MODE optional: dry-run or live",
        "META_GRAPH_VERSION optional",
      ],
    }, 503);
  }

  const accountResponse = await graphGet(`${env("META_IG_USER_ID")}?fields=id,username,name&access_token=${encodeURIComponent(env("META_ACCESS_TOKEN"))}`);
  const account = await readMetaResponse(accountResponse);
  if (!accountResponse.ok) {
    return json({
      status: "meta_test_failed",
      message: "Meta rejected the connector test. Check the Instagram user ID, token, and permissions.",
      meta: account,
    }, 502);
  }

  return json({
    status: "ready",
    message: `Connected to Instagram ${String(account.username || account.id || env("META_IG_USER_ID"))}. Publish mode: ${env("META_PUBLISH_MODE") || "dry-run"}.`,
    account,
    publishMode: env("META_PUBLISH_MODE") || "dry-run",
  });
}

async function publish(payload: PublishPayload): Promise<Response> {
  if (payload.action !== "publish_approved_social_item") {
    return json({ status: "bad_request", message: "Unsupported connector action." }, 400);
  }

  const missing = missingSecrets();
  if (missing.length) {
    return json({ status: "missing_config", message: `Missing Supabase secret(s): ${missing.join(", ")}.` }, 503);
  }

  const item = payload.item || {};
  if (item.status !== "Approved" && item.status !== "Sent to Connector") {
    return json({ status: "not_approved", message: "The item must be approved before the connector accepts it." }, 409);
  }

  const target = targetFrom(item);
  if (target === "unsupported") {
    return json({ status: "unsupported_channel", message: "Only Instagram and Facebook queue items can be sent to this connector." }, 422);
  }

  const caption = publicCopy(item.copy || "");
  if (!caption) {
    return json({ status: "missing_caption", message: "No public post copy was provided." }, 422);
  }

  const publishMode = env("META_PUBLISH_MODE") || "dry-run";
  const mediaUrl = mediaUrlFrom(payload);

  if (publishMode !== "live") {
    return json({
      status: "dry_run",
      message: "Dry-run accepted. Set META_PUBLISH_MODE=live in Supabase secrets to publish live.",
      target,
      caption,
      mediaUrl: mediaUrl || null,
    });
  }

  if (target === "facebook") {
    const pageId = env("META_FACEBOOK_PAGE_ID");
    const pageToken = env("META_PAGE_ACCESS_TOKEN") || env("META_ACCESS_TOKEN");
    if (!pageId) return json({ status: "missing_config", message: "Missing META_FACEBOOK_PAGE_ID for Facebook Page posting." }, 503);

    const params = new URLSearchParams({
      access_token: pageToken,
      message: caption,
    });
    if (mediaUrl) params.set("link", mediaUrl);

    const response = await graphPost(`${pageId}/feed`, params);
    const data = await readMetaResponse(response);
    return json({
      status: response.ok ? "published" : "publish_failed",
      target,
      meta: data,
    }, response.ok ? 200 : 502);
  }

  if (!mediaUrl) {
    return json({
      status: "missing_media",
      message: "Instagram live publishing needs a public image_url or video_url. The planner preview is not enough because Meta must fetch the media from a public URL.",
    }, 422);
  }

  const isVideo = /\.(mp4|mov|m4v)(\?|$)/i.test(mediaUrl) || String(item.channel || "").toLowerCase().includes("reel");
  const createParams = new URLSearchParams({
    access_token: env("META_ACCESS_TOKEN"),
    caption,
  });
  if (isVideo) {
    createParams.set("media_type", "REELS");
    createParams.set("video_url", mediaUrl);
  } else {
    createParams.set("image_url", mediaUrl);
  }

  const createResponse = await graphPost(`${env("META_IG_USER_ID")}/media`, createParams);
  const createData = await readMetaResponse(createResponse);
  if (!createResponse.ok || !createData.id) {
    return json({ status: "container_failed", target, meta: createData }, 502);
  }

  const publishParams = new URLSearchParams({
    access_token: env("META_ACCESS_TOKEN"),
    creation_id: String(createData.id),
  });
  const publishResponse = await graphPost(`${env("META_IG_USER_ID")}/media_publish`, publishParams);
  const publishData = await readMetaResponse(publishResponse);

  return json({
    status: publishResponse.ok ? "published" : "publish_failed",
    target,
    container: createData,
    meta: publishData,
  }, publishResponse.ok ? 200 : 502);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") return await statusCheck();
  if (req.method !== "POST") return json({ status: "method_not_allowed", message: "Use GET to test or POST to publish." }, 405);

  try {
    const payload = await req.json() as PublishPayload;
    return await publish(payload);
  } catch (error) {
    return json({
      status: "error",
      message: error instanceof Error ? error.message : "Unexpected connector error.",
    }, 500);
  }
});
