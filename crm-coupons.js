/* CRM customer coupon/gift discount system. */
(function(){
 const SETUP_KEY='coupon_type_setup';
 const defaults={reasons:['Event postponement','Customer appreciation','Service recovery','Promotion','Loyalty reward','Other'],types:['Percentage Discount','Flat-Dollar Discount','Free Admission','Complimentary / 100% Discount','Other'],scopes:['Any Event','Specific Event']};
 const setup=()=>{const s=Utils.load(SETUP_KEY,{}); return {reasons:[...new Set([...(defaults.reasons),...(s.reasons||[])])],types:[...new Set([...(defaults.types),...(s.types||[])])],scopes:[...new Set([...(defaults.scopes),...(s.scopes||[])])]};};
 const remember=(field,value)=>{value=String(value||'').trim();if(!value)return;const s=setup();if(!s[field].includes(value))s[field].push(value);Utils.save(SETUP_KEY,s);};
 const code=()=>`PTT-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
 function ensure(c){if(!Array.isArray(c.coupons))c.coupons=[];return c.coupons;}
 function issue(customerId,data={}){const c=CRM.get(customerId);if(!c)throw new Error('Customer not found'); const coupon={id:Utils.id(),code:String(data.code||code()).toUpperCase(),reason:String(data.reason||'Other'),type:String(data.type||'Percentage Discount'),value:Number(data.value||0),scope:String(data.scope||'Any Event'),eventId:data.eventId||'',expires:data.expires||'',neverExpires:data.neverExpires!==false,singleUse:data.singleUse!==false,status:'Active',issuedAt:new Date().toISOString(),redeemedAt:'',notes:String(data.notes||'')}; ensure(c).push(coupon); ['reasons','types','scopes'].forEach((f,i)=>remember(f,[coupon.reason,coupon.type,coupon.scope][i])); CRM.save(); return coupon;}
 function redeem(customerId,couponId){const c=CRM.get(customerId),p=c&&ensure(c).find(x=>x.id===couponId);if(!p)return false;p.status='Redeemed';p.redeemedAt=new Date().toISOString();CRM.save();return true;}
 function revoke(customerId,couponId){const c=CRM.get(customerId),p=c&&ensure(c).find(x=>x.id===couponId);if(!p)return false;p.status='Revoked';CRM.save();return true;}
 window.CRMCoupons={setup,remember,issue,redeem,revoke,forCustomer:id=>{const c=CRM.get(id);return c?ensure(c):[];}};
})();