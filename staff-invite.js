/* Employee invite/profile claim flow for the Staff Portal. */
(function(){
  const inviteToken=()=>new URLSearchParams(location.search).get('invite')||'';
  async function claimInvite(){
    try{
      if(!window.S?.access_token) return alert('Create your staff account or sign in first.');
      const fullName=document.getElementById('inviteFullName')?.value.trim()||'';
      const phone=document.getElementById('invitePhone')?.value.trim()||'';
      if(!fullName) return alert('Enter your name.');
      const r=await fetch(`${U}/functions/v1/employee-directory-api`,{method:'POST',headers:h(S.access_token),body:JSON.stringify({action:'claim_invite',token:inviteToken(),fullName,phone})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.ok===false) throw new Error(d.error||'Unable to complete employee profile.');
      alert('Employee profile connected. You are now in the company employee/staff directory.');
      const q=new URLSearchParams(location.search);q.delete('invite');history.replaceState({},'',location.pathname+(q.toString()?`?${q}`:''));
      if(typeof load==='function') load();
    }catch(e){alert(e.message)}
  }
  window.claimEmployeeInvite=claimInvite;
  function renderInvite(){
    const token=inviteToken(); if(!token) return;
    const appEl=document.getElementById('app'); if(!appEl) return;
    if(!window.S?.access_token){
      const card=document.createElement('div');card.className='card';card.id='employeeInviteCard';card.innerHTML='<h3>Employee / Staff Invitation</h3><p>Create your staff account or sign in using the email this invitation was sent to. After you sign in, you will complete your employee profile.</p>';
      if(!document.getElementById('employeeInviteCard')) appEl.prepend(card);
      return;
    }
    if(document.getElementById('employeeInviteCard')) document.getElementById('employeeInviteCard').remove();
    const card=document.createElement('div');card.className='card';card.id='employeeInviteCard';card.innerHTML=`<h3>Complete Employee / Staff Profile</h3><p>This information will be sent to the organizer's reusable employee directory so you can be assigned to current and future events without re-entering it.</p><label>Full Name</label><input id="inviteFullName" autocomplete="name"><label>Login Email</label><input value="${esc(S.user?.email||'')}" readonly><label>Phone</label><input id="invitePhone" type="tel" autocomplete="tel"><button type="button" onclick="claimEmployeeInvite()">Complete Employee Profile</button>`;
    appEl.prepend(card);
  }
  if(typeof window.load==='function'){
    const prior=window.load;
    window.load=async function(){const r=await prior.apply(this,arguments);setTimeout(renderInvite,0);return r;};
  }
  setTimeout(renderInvite,50);
})();
