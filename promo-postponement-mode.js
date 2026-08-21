(function(){
  const MEDIA_URL='https://mmstqostdqouxaiyrxtv.supabase.co/storage/v1/object/public/promo-media/users/ff0ae427-a6f7-4cbd-88bc-8a0c4c4d21af/events/72f3c4d7-e81b-463e-ae8e-c33b2ebc0a2e/1787321661014-f0e43b22-7601.png';
  const COPY=`🚨 IMPORTANT EVENT UPDATE\n\nPAINT THE TOWN & OAKLAND MADE HAVE BEEN POSTPONED\n\nOur events originally scheduled for Saturday, August 29 will be moving to a new date.\n\nWe are currently working to finalize the new date and will make an official announcement as soon as it is confirmed.\n\n🎟️ Already have a ticket? Your ticket will be honored for the rescheduled event. Additional information will be sent directly to ticket holders once the new date is confirmed.\n\nThank you to everyone who has supported, shared, followed, and planned to join us.\n\nThis is a postponement — not a cancellation.\n\n🎨 Paint the Town — Oakland Sip & Paint Experience\n🖼️ Oakland Made — A Showcase of Original Oakland Art\n\nNEW DATE COMING SOON.\n\nThe Art. The Culture. The Town.`;
  function apply(){
    try{
      const key='promoAgent';
      let state={};
      if(typeof Utils!=='undefined'&&typeof Utils.load==='function') state=Utils.load(key,{})||{};
      state.dailyPostGoal=0;
      state.lastPlan=null;
      state.lastRun='';
      state.queue=[
        {id:'postponement-instagram',title:'Event Postponement',channel:'Instagram',copy:COPY,status:'Draft',publicMediaUrl:MEDIA_URL,mediaUrl:MEDIA_URL,createdAt:new Date().toISOString()},
        {id:'postponement-facebook',title:'Event Postponement',channel:'Facebook',copy:COPY,status:'Draft',publicMediaUrl:MEDIA_URL,mediaUrl:MEDIA_URL,createdAt:new Date().toISOString()}
      ];
      state.mediaLibrary=[{id:'postponement-media',name:'Event Postponement',type:'image/png',url:MEDIA_URL,publicUrl:MEDIA_URL,publicMediaUrl:MEDIA_URL,createdAt:new Date().toISOString()}];
      state.creative={...(state.creative||{}),mediaGoal:'Postponement notice only',visualDirection:'Use only the uploaded event postponement graphic.',extraInstructions:'EVENT POSTPONED. New date is not determined yet. Do not generate or schedule normal event promotion until a new date is confirmed.',primaryReferenceId:'postponement-media',referenceFiles:[]};
      state.offer='EVENT POSTPONED — NEW DATE COMING SOON';
      if(typeof Utils!=='undefined'&&typeof Utils.save==='function') Utils.save(key,state);
      localStorage.setItem('paintTownPostponementModeApplied','1');
      return true;
    }catch(e){console.error('Unable to apply postponement mode',e);return false;}
  }
  window.PaintTownPostponementMode={apply,MEDIA_URL,COPY};
  if(localStorage.getItem('paintTownPostponementModeApplied')!=='1') apply();
})();
