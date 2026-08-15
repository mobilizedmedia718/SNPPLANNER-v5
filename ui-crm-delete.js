(function(){
  function addDeleteButton(){
    const workspace=document.getElementById('workspace');
    if(!workspace||workspace.querySelector('[data-crm-delete-button]'))return;
    const editButton=[...workspace.querySelectorAll('button')].find(b=>/edit customer/i.test(b.textContent||''));
    if(!editButton)return;
    const match=(editButton.getAttribute('onclick')||'').match(/renderCustomerEdit\('([^']+)'\)/);
    if(!match)return;
    const id=match[1];
    const btn=document.createElement('button');
    btn.type='button';
    btn.dataset.crmDeleteButton='1';
    btn.textContent='Delete Customer';
    btn.style.marginLeft='10px';
    btn.onclick=function(){
      const c=CRM.get(id);
      const label=(CRM.fullName(c)||c?.company||c?.email||'this customer').trim();
      if(!confirm(`Delete ${label}? This removes the customer from SNP Planner.`))return;
      CRM.remove(id);
      UI.renderCRM();
    };
    editButton.insertAdjacentElement('afterend',btn);
  }

  if(!window.UI)return;
  const originalDetail=UI.renderCustomerDetail;
  UI.renderCustomerDetail=function(id){
    const result=originalDetail.call(this,id);
    addDeleteButton();
    return result;
  };
})();
