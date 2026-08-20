/* Inventory totals: distinguish historical purchase spend from current stock value. */
(function(){
  if (typeof UI === 'undefined' || typeof Inventory === 'undefined' || typeof Utils === 'undefined') return;

  Inventory.totalPurchaseSpend = function(){
    return Inventory.all().reduce((sum,item)=>{
      const total = Number(item.totalPurchaseCost ?? item.purchaseCost ?? 0);
      return sum + (Number.isFinite(total) ? Math.max(0,total) : 0);
    },0);
  };

  const originalRenderInventory = UI.renderInventory;
  if (typeof originalRenderInventory !== 'function') return;

  UI.renderInventory = function(){
    const result = originalRenderInventory.apply(UI, arguments);
    const workspace = document.getElementById('workspace');
    if (!workspace) return result;

    // Existing "Total Cost Value" is a current-stock valuation (quantity × unit cost),
    // not historical purchase spend. Rename it anywhere it appears so the distinction is clear.
    workspace.querySelectorAll('h1,h2,h3,h4,p,strong,span,div').forEach((node)=>{
      if (node.children.length) return;
      const text = String(node.textContent || '').trim();
      if (text === 'Total Cost Value' || text === 'Inventory Cost Value' || text === 'Total Inventory Cost') {
        node.textContent = 'Current Stock Value';
      }
    });

    if (!workspace.querySelector('[data-inventory-purchase-spend]')) {
      const summary = document.createElement('div');
      summary.className = 'card';
      summary.dataset.inventoryPurchaseSpend = '1';
      summary.innerHTML = `
        <h3>Inventory Purchase Totals</h3>
        <p><strong>Total Purchase Spend:</strong> ${Utils.money(Inventory.totalPurchaseSpend())}</p>
        <p><strong>Current Stock Value:</strong> ${Utils.money(Inventory.totalCostValue())}</p>
        <p><small>Total Purchase Spend includes purchased items even when their current quantity is 0. Current Stock Value reflects only inventory still on hand.</small></p>`;

      const heading = workspace.querySelector('h2');
      if (heading && heading.nextSibling) heading.parentNode.insertBefore(summary, heading.nextSibling);
      else workspace.prepend(summary);
    }

    return result;
  };
})();
