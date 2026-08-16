begin;

create index if not exists employee_invites_claimed_by_idx
  on public.employee_invites (claimed_by);
create index if not exists employee_invites_owner_user_id_idx
  on public.employee_invites (owner_user_id);
create index if not exists employee_profiles_staff_user_id_idx
  on public.employee_profiles (staff_user_id);
create index if not exists ticket_email_delivery_log_order_id_idx
  on public.ticket_email_delivery_log (order_id);

alter policy "Users can view their own SNP Planner data" on public.app_storage
  using ((select auth.uid()) = user_id);
alter policy "Users can create their own SNP Planner data" on public.app_storage
  with check ((select auth.uid()) = user_id);
alter policy "Users can update their own SNP Planner data" on public.app_storage
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "Users can delete their own SNP Planner data" on public.app_storage
  using ((select auth.uid()) = user_id);

alter policy "Users can view their own stripe orders" on public.stripe_orders
  using ((select auth.uid()) = user_id);
alter policy "Users can insert their own stripe orders" on public.stripe_orders
  with check ((select auth.uid()) = user_id);
alter policy "Users can update their own stripe orders" on public.stripe_orders
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users can view their own Eventbrite links" on public.eventbrite_event_links
  using ((select auth.uid()) = user_id);
alter policy "Users can insert their own Eventbrite links" on public.eventbrite_event_links
  with check ((select auth.uid()) = user_id);
alter policy "Users can update their own Eventbrite links" on public.eventbrite_event_links
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy employee_invites_owner_all on public.employee_invites
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists employee_profiles_owner_all on public.employee_profiles;
drop policy if exists employee_profiles_self_read on public.employee_profiles;
create policy employee_profiles_select on public.employee_profiles
  for select to authenticated
  using (owner_user_id = (select auth.uid()) or staff_user_id = (select auth.uid()));
create policy employee_profiles_owner_insert on public.employee_profiles
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy employee_profiles_owner_update on public.employee_profiles
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy employee_profiles_owner_delete on public.employee_profiles
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists event_staff_owner_all on public.event_staff_access;
drop policy if exists event_staff_self_read on public.event_staff_access;
create policy event_staff_select on public.event_staff_access
  for select to authenticated
  using (owner_user_id = (select auth.uid()) or staff_user_id = (select auth.uid()));
create policy event_staff_owner_insert on public.event_staff_access
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy event_staff_owner_update on public.event_staff_access
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy event_staff_owner_delete on public.event_staff_access
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists staff_shifts_owner_select on public.staff_shifts;
drop policy if exists staff_shifts_self_select on public.staff_shifts;
create policy staff_shifts_select on public.staff_shifts
  for select to authenticated
  using (owner_user_id = (select auth.uid()) or staff_user_id = (select auth.uid()));

alter policy staff_action_owner_read on public.staff_action_log
  using ((select auth.uid()) = owner_user_id);

alter policy ticket_email_log_owner_read on public.ticket_email_delivery_log
  using (exists (
    select 1
    from public.stripe_orders orders
    where orders.id = ticket_email_delivery_log.order_id
      and orders.user_id = (select auth.uid())
  ));

commit;
