/* TrackIt — single-file app controller
   Keeps data local on the device. No account or transaction data is sent anywhere. */
(() => {
  "use strict";

  const KEY = "trackit_data_v2";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const id = p => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const month = () => today().slice(0,7);
  const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);
  const esc = v => String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

  const empty = {categories:{expenses:[],incomes:[]},accounts:[],investments:[],savings:[],transactions:[],settings:{statistics:{cash:true,bank:true,investments:true,savings:true}}};
  let data = load();
  let pending = null;
  let transfer = {from:null,to:null};
  let modal = null;

  function load(){ try { return normalize(JSON.parse(localStorage.getItem(KEY)||"null")); } catch { return normalize(null); } }
  function normalize(x){
    const d=structuredClone(empty); if(!x||typeof x!=="object") return d;
    d.categories.expenses=Array.isArray(x.categories?.expenses)?x.categories.expenses:[];
    d.categories.incomes=Array.isArray(x.categories?.incomes)?x.categories.incomes:[];
    d.accounts=Array.isArray(x.accounts)?x.accounts:[];
    d.investments=Array.isArray(x.investments)?x.investments:[];
    d.savings=Array.isArray(x.savings)?x.savings:[];
    d.transactions=Array.isArray(x.transactions)?x.transactions:[];
    d.settings.statistics={...d.settings.statistics,...(x.settings?.statistics||{})};
    return d;
  }
  function save(){ localStorage.setItem(KEY,JSON.stringify(data)); }
  function primary(type){ return data.accounts.find(a=>a.type===type&&a.primary) || null; }
  function balance(accountId){ return data.transactions.reduce((b,t)=>{ const n=Number(t.amount)||0; if(t.type==="expense"&&t.accountId===accountId)return b-n; if(t.type==="income"&&t.accountId===accountId)return b+n; if(t.type==="transfer"){if(t.fromAccountId===accountId)b-=n;if(t.toAccountId===accountId)b+=n;} return b; },0); }
  function txToday(t){ return t.date===today(); }
  function txMonth(t){ return t.date?.slice(0,7)===month(); }
  function sums(list){ return list.reduce((r,t)=>{if(t.type==="expense")r.e+=+t.amount;if(t.type==="income")r.i+=+t.amount;return r},{e:0,i:0}); }

  function boot(){
    injectStyle();
    setupNavigation(); setupInputs(); setupGlobalActions(); setupTransfer();
    renderAll(); save();
    if(window.lucide) window.lucide.createIcons();
  }

  function setupNavigation(){
    $$(".nav-item").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
    $("#headerSettingsButton")?.addEventListener("click",()=>go("settingsPage"));
    $("#viewAllTransactionsButton")?.addEventListener("click",()=>go("transactionsPage"));
  }
  function go(page){
    const pageId=page.endsWith("Page")?page:page+"Page";
    $$(".page").forEach(p=>p.classList.toggle("active",p.id===pageId));
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===pageId));
    if(pageId==="dashboardPage") renderDashboard();
    if(pageId==="transactionsPage") renderTransactions();
    if(pageId==="statisticsPage") renderStatistics();
    if(pageId==="settingsPage") renderSettings();
    scrollTo({top:0,behavior:"smooth"});
  }
  window.switchPage=go;

  function setupInputs(){
    const map={expenseCashAmount:["expense","cash"],expenseBankAmount:["expense","bank"],incomeCashAmount:["income","cash"],incomeBankAmount:["income","bank"]};
    Object.entries(map).forEach(([eid,[type,acct]])=>{ const el=$("#"+eid); if(!el)return; el.dataset.entryType=type; el.dataset.accountType=acct; el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key==="Tab"){e.preventDefault(); startQuick(el,type,acct);}}); el.addEventListener("input",()=>{el.value=el.value.replace(/[^0-9.]/g,"").replace(/(\..*)\./g,"$1");}); });
  }
  function startQuick(input,type,acct){
    const amount=Number(input.value); if(!amount||amount<=0){input.focus();toast("Enter an amount first.");return;}
    const a=primary(acct); if(!a){toast(`Add a primary ${acct} account first.`); openSettingsSection("accounts"); return;}
    const cats=data.categories[type+"s"]||[]; if(!cats.length){toast(`Add an ${type} category first.`); openSettingsSection(type+"Categories");return;}
    pending={input,type,accountId:a.id,amount};
    openPicker(type,cats);
  }
  function openPicker(type,cats){
    showModal(`<div class="modal-head"><div><small>ADD ${type.toUpperCase()}</small><h2>Choose category</h2></div><button class="modal-close" data-close>×</button></div><div class="picker-list">${cats.map(c=>`<button class="picker-option" data-cat="${esc(c.id)}"><span>${esc(c.name)}</span><span>›</span></button>`).join("")}</div>`);
    $$("[data-cat]").forEach(b=>b.addEventListener("click",()=>{const c=cats.find(x=>x.id===b.dataset.cat); if(c)finishQuick(c);}));
  }
  function finishQuick(cat){
    if(!pending)return; data.transactions.push({id:id("tx"),type:pending.type,amount:pending.amount,accountId:pending.accountId,categoryId:cat.id,categoryName:cat.name,date:today(),createdAt:Date.now()}); pending.input.value=""; closeModal(); save(); renderAll(); toast(`${pending.type==="expense"?"Expense":"Income"} added.`); pending=null; }

  function setupTransfer(){
    $("#transferFromButton")?.addEventListener("click",()=>pickAccount("from"));
    $("#transferToButton")?.addEventListener("click",()=>pickAccount("to"));
    $("#transferButton")?.addEventListener("click",addTransfer);
  }
  function pickAccount(side){
    const accounts=data.accounts; if(accounts.length<2){toast("Add at least two accounts to transfer money.");openSettingsSection("accounts");return;}
    showModal(`<div class="modal-head"><div><small>SELF TRANSFER</small><h2>Choose account</h2></div><button class="modal-close" data-close>×</button></div><div class="picker-list">${accounts.map(a=>`<button class="picker-option" data-acct="${a.id}"><span>${esc(a.name)} · ${a.type}</span><span>›</span></button>`).join("")}</div>`);
    $$('[data-acct]').forEach(b=>b.addEventListener("click",()=>{transfer[side]=b.dataset.acct; updateTransferLabels();closeModal();}));
  }
  function updateTransferLabels(){ const f=data.accounts.find(a=>a.id===transfer.from)||primary("cash");const t=data.accounts.find(a=>a.id===transfer.to)||primary("bank"); if($("#transferFromValue"))$("#transferFromValue").textContent=f?.name||"Select account";if($("#transferToValue"))$("#transferToValue").textContent=t?.name||"Select account"; }
  function addTransfer(){
    const amount=Number($("#transferAmount")?.value); const f=data.accounts.find(a=>a.id===transfer.from)||primary("cash"); const t=data.accounts.find(a=>a.id===transfer.to)||primary("bank");
    if(!f||!t){toast("Choose both accounts.");return;} if(f.id===t.id){toast("Choose two different accounts.");return;} if(!amount||amount<=0){toast("Enter an amount.");return;}
    data.transactions.push({id:id("tx"),type:"transfer",amount,fromAccountId:f.id,toAccountId:t.id,date:today(),createdAt:Date.now()}); $("#transferAmount").value="";save();renderAll();toast("Transfer completed.");
  }

  function renderAll(){renderDashboard();renderTransactions();renderStatistics();renderSettings();updateTransferLabels();}
  function renderDashboard(){
    const st=sums(data.transactions.filter(txToday)), sm=sums(data.transactions.filter(txMonth));
    setText("todayExpense",money(st.e));setText("todayIncome",money(st.i));setText("monthExpense",money(sm.e));setText("monthIncome",money(sm.i));setText("todayNet",money(st.i-st.e));setText("monthNet",money(sm.i-sm.e));
    const cash=primary("cash"),bank=primary("bank");setText("shiftCashBalance",money(cash?balance(cash.id):0));setText("shiftBankBalance",money(bank?balance(bank.id):0));setText("shiftTodayTransfers",money(data.transactions.filter(t=>txToday(t)&&t.type==="transfer").reduce((s,t)=>s+ +t.amount,0)));
    const ecash=$("#expenseCashAmount"),ebank=$("#expenseBankAmount"),icash=$("#incomeCashAmount"),ibank=$("#incomeBankAmount"); if(ecash)ecash.closest(".quick-amount")?.querySelector("label")?.replaceChildren(document.createTextNode(cash?.name||"Primary Cash"));if(ebank)ebank.closest(".quick-amount")?.querySelector("label")?.replaceChildren(document.createTextNode(bank?.name||"Primary Bank"));if(icash)icash.closest(".quick-amount")?.querySelector("label")?.replaceChildren(document.createTextNode(cash?.name||"Primary Cash"));if(ibank)ibank.closest(".quick-amount")?.querySelector("label")?.replaceChildren(document.createTextNode(bank?.name||"Primary Bank"));
    const notice=$("#accountSetupNotice");if(notice)notice.hidden=!!(cash&&bank);
    renderToday();
  }
  function renderToday(){ const el=$("#todayTransactions");if(!el)return; const list=data.transactions.filter(txToday).sort((a,b)=>b.createdAt-a.createdAt);setText("todayCount",String(list.length));el.innerHTML=list.length?list.map(txHTML).join(""):`<div class="empty-state">No transactions today.</div>`;bindTxGestures(el); }
  function renderTransactions(){const el=$("#allTransactions");if(!el)return;const list=[...data.transactions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.createdAt-a.createdAt);el.innerHTML=list.length?list.map(txHTML).join(""):`<div class="empty-state">No transactions yet.</div>`;bindTxGestures(el);}
  function txHTML(t){ const isT=t.type==="transfer";const title=isT?"Self transfer":(t.categoryName||t.type);const account=isT?`${esc(data.accounts.find(a=>a.id===t.fromAccountId)?.name||"")} → ${esc(data.accounts.find(a=>a.id===t.toAccountId)?.name||"")}`:esc(data.accounts.find(a=>a.id===t.accountId)?.name||"");const sign=t.type==="income"?"+":t.type==="expense"?"−":"↔";return `<article class="transaction-row" data-tx="${t.id}"><div class="tx-main"><strong>${esc(title)}</strong><small>${formatDate(t.date)} · ${account}</small></div><strong class="tx-amount ${t.type}">${sign}${money(t.amount).replace("₹","₹")}</strong></article>`; }
  function bindTxGestures(root){$$(".transaction-row",root).forEach(row=>{row.addEventListener("click",e=>{if(Math.abs(row._dx||0)>30)return;editTransaction(row.dataset.tx);});let sx=0;row.addEventListener("touchstart",e=>sx=e.touches[0].clientX,{passive:true});row.addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-sx;if(dx<-70){row._dx=dx;deleteTransaction(row.dataset.tx);setTimeout(()=>row._dx=0,250);}}, {passive:true});let down=false,st=0;row.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse")return;down=true;st=e.clientX});row.addEventListener("pointerup",e=>{if(!down)return;down=false;if(st-e.clientX>90){row._dx=st-e.clientX;deleteTransaction(row.dataset.tx);setTimeout(()=>row._dx=0,250);}});});}
  function deleteTransaction(tid){const i=data.transactions.findIndex(t=>t.id===tid);if(i<0)return;data.transactions.splice(i,1);save();renderAll();toast("Transaction deleted.");}
  function editTransaction(tid){const t=data.transactions.find(x=>x.id===tid);if(!t)return; if(t.type==="transfer"){showTransferEdit(t);return;} showModal(`<div class="modal-head"><div><small>EDIT TRANSACTION</small><h2>${esc(t.categoryName||t.type)}</h2></div><button class="modal-close" data-close>×</button></div><label>Amount<input id="editAmount" type="number" inputmode="decimal" value="${t.amount}"></label><label>Date<input id="editDate" type="date" value="${t.date}"></label><div class="modal-actions"><button class="primary-action" id="saveEdit">Save</button><button class="danger-action" id="deleteEdit">Delete</button></div>`);$("#saveEdit").onclick=()=>{t.amount=Number($("#editAmount").value)||t.amount;t.date=$("#editDate").value||t.date;save();closeModal();renderAll();};$("#deleteEdit").onclick=()=>{deleteTransaction(tid);closeModal();};}
  function showTransferEdit(t){showModal(`<div class="modal-head"><div><small>EDIT TRANSFER</small><h2>Self transfer</h2></div><button class="modal-close" data-close>×</button></div><label>Amount<input id="editAmount" type="number" value="${t.amount}"></label><label>Date<input id="editDate" type="date" value="${t.date}"></label><div class="modal-actions"><button class="primary-action" id="saveEdit">Save</button><button class="danger-action" id="deleteEdit">Delete</button></div>`);$("#saveEdit").onclick=()=>{t.amount=Number($("#editAmount").value)||t.amount;t.date=$("#editDate").value||t.date;save();closeModal();renderAll();};$("#deleteEdit").onclick=()=>{deleteTransaction(t.id);closeModal();};}

  function renderStatistics(){const el=$("#statisticsContent");if(!el)return;const t=data.transactions.filter(x=>x.type!=="transfer"),tm=t.filter(txMonth),tt=t.filter(txToday),m=sums(tm),d=sums(tt);const days=Math.max(1,new Date().getDate());const avgIncome=m.i/days;const enabled=data.settings.statistics;const accountBalances=data.accounts.filter(a=>(a.type==="cash"?enabled.cash:enabled.bank)).reduce((s,a)=>s+balance(a.id),0);const inv=enabled.investments?data.investments.reduce((s,i)=>s+(+i.amount||0),0):0;const sav=enabled.savings?data.savings.reduce((s,i)=>s+(+i.current||0),0):0;el.innerHTML=`<div class="stats-card"><span>Today’s net</span><strong>${money(d.i-d.e)}</strong></div><div class="stats-card"><span>This month’s net</span><strong>${money(m.i-m.e)}</strong></div><div class="stats-card"><span>Average daily income</span><strong>${money(avgIncome)}</strong><small>Based on this month so far</small></div><div class="stats-card"><span>Cash + bank balances</span><strong>${money(accountBalances)}</strong></div><div class="stats-card"><span>Investments counted</span><strong>${money(inv)}</strong></div><div class="stats-card"><span>Savings counted</span><strong>${money(sav)}</strong></div>`;}

  function renderSettings(){const el=$("#settingsContent");if(!el)return;el.innerHTML=`<div class="settings-stack">
    ${settingsBlock("Expense categories","Add, edit or remove your own categories.",data.categories.expenses,"expense")}
    ${settingsBlock("Income categories","Add, edit or remove your own categories.",data.categories.incomes,"income")}
    ${accountsBlock()}
    ${investmentsBlock()}
    ${savingsBlock()}
    <section class="settings-group"><div class="settings-title"><div><h3>Data</h3><p>Keep a portable backup of your TrackIt data.</p></div></div><div class="settings-actions"><button data-export-json>Export JSON</button><button data-import-json>Import JSON</button><button data-export-pdf>Export statement PDF</button></div></section>
  </div>`;
    $$("[data-add-cat]").forEach(b=>b.onclick=()=>addCategory(b.dataset.addCat));
    $$("[data-del-cat]").forEach(b=>b.onclick=()=>deleteCategory(b.dataset.delCat,b.dataset.type));
    $$("[data-edit-cat]").forEach(b=>b.onclick=()=>editCategory(b.dataset.editCat,b.dataset.type));
    $$("[data-add-account]").forEach(b=>b.onclick=addAccount);
    $$("[data-primary]").forEach(b=>b.onchange=()=>setPrimary(b.dataset.primary,b.dataset.type,b.checked));
    $$("[data-del-account]").forEach(b=>b.onclick=()=>deleteAccount(b.dataset.delAccount));
    $$("[data-add-investment]").forEach(b=>b.onclick=addInvestment);$$("[data-del-investment]").forEach(b=>b.onclick=()=>deleteInvestment(b.dataset.delInvestment));
    $$("[data-add-saving]").forEach(b=>b.onclick=addSaving);$$("[data-del-saving]").forEach(b=>b.onclick=()=>deleteSaving(b.dataset.delSaving));
    $$("[data-stat-toggle]").forEach(b=>b.onchange=()=>{data.settings.statistics[b.dataset.statToggle]=b.checked;save();renderStatistics();});
    $("[data-export-json]")?.addEventListener("click",exportJSON);$("[data-import-json]")?.addEventListener("click",importJSON);$("[data-export-pdf]")?.addEventListener("click",exportPDF);
  }
  function settingsBlock(title,desc,cats,type){return `<section class="settings-group"><div class="settings-title"><div><h3>${title}</h3><p>${desc}</p></div><button data-add-cat="${type}">Add</button></div><div class="settings-list">${cats.length?cats.map(c=>`<div class="setting-row"><span>${esc(c.name)}</span><span><button data-edit-cat="${c.id}" data-type="${type}">Edit</button><button class="danger-text" data-del-cat="${c.id}" data-type="${type}">Delete</button></span></div>`).join(""):`<div class="empty-state">No categories yet.</div>`}</div></section>`;}
  function accountsBlock(){return `<section class="settings-group" id="accounts"><div class="settings-title"><div><h3>Accounts</h3><p>At least one Cash and one Bank account are required for transactions.</p></div><button data-add-account>Add</button></div><div class="settings-list">${data.accounts.length?data.accounts.map(a=>`<div class="setting-row account-row"><div><strong>${esc(a.name)}</strong><small>${a.type} · ${money(balance(a.id))}</small></div><span><label class="switch"><input type="checkbox" data-primary="${a.id}" data-type="${a.type}" ${a.primary?"checked":""}><i></i></label><button class="danger-text" data-del-account="${a.id}">Delete</button></span></div>`).join(""):`<div class="empty-state">Add one cash and one bank account.</div>`}</div></section>`;}
  function investmentsBlock(){return `<section class="settings-group"><div class="settings-title"><div><h3>Investments</h3><p>Track investments and their return.</p></div><button data-add-investment>Add</button></div><div class="settings-list">${data.investments.map(i=>`<div class="setting-row"><div><strong>${esc(i.name)}</strong><small>${money(i.amount)} · ${Number(i.returnPct)||0}% return</small></div><span><label class="switch"><input type="checkbox" data-stat-toggle="investments" ${data.settings.statistics.investments?"checked":""}><i></i></label><button class="danger-text" data-del-investment="${i.id}">Delete</button></span></div>`).join("")||`<div class="empty-state">No investments yet.</div>`}</div></section>`;}
  function savingsBlock(){return `<section class="settings-group"><div class="settings-title"><div><h3>Savings</h3><p>Things you want to save for and their goals.</p></div><button data-add-saving>Add</button></div><div class="settings-list">${data.savings.map(s=>`<div class="setting-row"><div><strong>${esc(s.name)}</strong><small>${money(s.current)} / ${money(s.goal)}</small></div><span><label class="switch"><input type="checkbox" data-stat-toggle="savings" ${data.settings.statistics.savings?"checked":""}><i></i></label><button class="danger-text" data-del-saving="${s.id}">Delete</button></span></div>`).join("")||`<div class="empty-state">No savings goals yet.</div>`}</div></section>`;}

  function addCategory(type){const name=prompt(`Add ${type} category`);if(!name?.trim())return;const arr=data.categories[type+"s"];arr.push({id:id("cat"),name:name.trim()});save();renderSettings();}
  function editCategory(cid,type){const c=data.categories[type+"s"].find(x=>x.id===cid);if(!c)return;const name=prompt("Category name",c.name);if(name?.trim()){c.name=name.trim();data.transactions.filter(t=>t.categoryId===cid).forEach(t=>t.categoryName=c.name);save();renderAll();}}
  function deleteCategory(cid,type){if(data.transactions.some(t=>t.categoryId===cid)){toast("This category is used by a transaction.");return;}data.categories[type+"s"]=data.categories[type+"s"].filter(c=>c.id!==cid);save();renderSettings();}
  function addAccount(){showModal(`<div class="modal-head"><div><small>ACCOUNT</small><h2>Add account</h2></div><button class="modal-close" data-close>×</button></div><label>Name<input id="newName" maxlength="40" autofocus></label><label>Type<select id="newType"><option value="cash">Cash</option><option value="bank">Bank</option></select></label><div class="modal-actions"><button class="primary-action" id="saveAccount">Add account</button></div>`);$("#saveAccount").onclick=()=>{const name=$("#newName").value.trim(),type=$("#newType").value;if(!name)return;if(!data.accounts.some(a=>a.type===type)){}data.accounts.push({id:id("acc"),name,type,primary:!data.accounts.some(a=>a.type===type)});save();closeModal();renderAll();};}
  function setPrimary(aid,type,on){if(!on)return;data.accounts.filter(a=>a.type===type).forEach(a=>a.primary=a.id===aid);save();renderAll();}
  function deleteAccount(aid){if(data.transactions.some(t=>t.accountId===aid||t.fromAccountId===aid||t.toAccountId===aid)){toast("This account has transactions and cannot be deleted.");return;}const a=data.accounts.find(x=>x.id===aid);if(!a)return;data.accounts=data.accounts.filter(x=>x.id!==aid);const replacement=data.accounts.find(x=>x.type===a.type);if(replacement)replacement.primary=true;save();renderAll();}
  function addInvestment(){showModal(`<div class="modal-head"><div><small>INVESTMENT</small><h2>Add investment</h2></div><button class="modal-close" data-close>×</button></div><label>Name<input id="newName"></label><label>Amount<input id="newAmount" type="number"></label><label>Return %<input id="newReturn" type="number" step="0.01"></label><div class="modal-actions"><button class="primary-action" id="saveItem">Add</button></div>`);$("#saveItem").onclick=()=>{const name=$("#newName").value.trim();if(!name)return;data.investments.push({id:id("inv"),name,amount:Number($("#newAmount").value)||0,returnPct:Number($("#newReturn").value)||0});save();closeModal();renderAll();};}
  function deleteInvestment(i){data.investments=data.investments.filter(x=>x.id!==i);save();renderAll();}
  function addSaving(){showModal(`<div class="modal-head"><div><small>SAVINGS</small><h2>Add savings goal</h2></div><button class="modal-close" data-close>×</button></div><label>Name<input id="newName"></label><label>Goal amount<input id="newGoal" type="number"></label><label>Current saved<input id="newCurrent" type="number"></label><div class="modal-actions"><button class="primary-action" id="saveItem">Add</button></div>`);$("#saveItem").onclick=()=>{const name=$("#newName").value.trim();if(!name)return;data.savings.push({id:id("sav"),name,goal:Number($("#newGoal").value)||0,current:Number($("#newCurrent").value)||0});save();closeModal();renderAll();};}
  function deleteSaving(i){data.savings=data.savings.filter(x=>x.id!==i);save();renderAll();}

  function setupGlobalActions(){
    $("#setupAccountsButton")?.addEventListener("click",()=>openSettingsSection("accounts"));
    $("#editInvestmentsButton")?.addEventListener("click",()=>openSettingsSection("investments"));
    $("#editSavingsButton")?.addEventListener("click",()=>openSettingsSection("savings"));
    document.addEventListener("click",e=>{const b=e.target.closest("[data-close]");if(b)closeModal();});
  }
  function openSettingsSection(idName){go("settingsPage");setTimeout(()=>$("#"+idName)?.scrollIntoView({behavior:"smooth",block:"start"}),80);}

  function showModal(html){closeModal();const root=$("#modal");if(root){root.hidden=false;const c=$("#modalContent");if(c)c.innerHTML=html;root.querySelector(".modal-sheet")?.classList.add("trackit-modal-sheet");root.querySelector(".modal-backdrop")?.addEventListener("click",closeModal);modal=root;}else{const wrap=document.createElement("div");wrap.id="trackitDynamicModal";wrap.className="trackit-modal-overlay";wrap.innerHTML=`<div class="trackit-modal-backdrop"></div><div class="trackit-modal">${html}</div>`;document.body.appendChild(wrap);wrap.querySelector(".trackit-modal-backdrop").onclick=closeModal;modal=wrap;} document.body.classList.add("modal-open");}
  function closeModal(){if(!modal)return;modal.hidden=true;modal.remove?.();modal=null;const root=$("#modal");if(root)root.hidden=true;document.body.classList.remove("modal-open");}
  function toast(msg){let t=$("#trackitToast");if(!t){t=document.createElement("div");t.id="trackitToast";document.body.appendChild(t);}t.textContent=msg;t.classList.add("show");clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove("show"),2200);}
  function setText(idv,v){const e=document.getElementById(idv);if(e)e.textContent=v;}

  function exportJSON(){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});download(blob,`trackit-backup-${today()}.json`);}
  function importJSON(){const input=document.createElement("input");input.type="file";input.accept="application/json,.json";input.onchange=async()=>{try{const x=JSON.parse(await input.files[0].text());data=normalize(x);save();renderAll();toast("Data imported.");}catch{toast("Invalid JSON file.");}};input.click();}
  function exportPDF(){const st=sums(data.transactions.filter(txMonth));const lines=["TrackIt — Statement",`Generated: ${new Date().toLocaleString("en-IN")}`,"",`This month income: ${money(st.i)}`,`This month expenses: ${money(st.e)}`,`This month net: ${money(st.i-st.e)}`,"",...data.transactions.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(t=>`${t.date} | ${t.type} | ${t.categoryName||"Self transfer"} | ${money(t.amount)}`)];const w=window.open("","_blank");if(!w){toast("Allow pop-ups to export PDF.");return;}w.document.write(`<pre style="font:14px/1.6 Arial;white-space:pre-wrap;padding:32px">${esc(lines.join("\n"))}</pre>`);w.document.close();w.focus();setTimeout(()=>w.print(),300);}
  function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}

  function injectStyle(){if($("#trackit-runtime-style"))return;const s=document.createElement("style");s.id="trackit-runtime-style";s.textContent=`
    .settings-stack{display:grid;gap:16px}.settings-group,.stats-card{background:var(--card,#fff);border:1px solid rgba(40,30,60,.08);border-radius:20px;padding:18px}.settings-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.settings-title h3{margin:0}.settings-title p,.setting-row small{display:block;color:#777;margin:5px 0 0;font-size:.84rem}.settings-list{margin-top:12px}.setting-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px 0;border-top:1px solid rgba(40,30,60,.07)}.setting-row button,.settings-title button,.settings-actions button{border:0;background:#f1eef7;border-radius:12px;padding:9px 12px;cursor:pointer}.danger-text{color:#b42318!important}.settings-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.stats-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.stats-card span{display:block;color:#777}.stats-card strong{display:block;font-size:1.45rem;margin-top:8px}.stats-card small{display:block;color:#888;margin-top:5px}.switch{display:inline-flex;align-items:center;position:relative}.switch input{position:absolute;opacity:0}.switch i{display:block;width:44px;height:26px;border-radius:99px;background:#d8d5dc;position:relative;transition:.2s}.switch i:after{content:"";position:absolute;width:20px;height:20px;border-radius:50%;background:#fff;top:3px;left:3px;box-shadow:0 1px 3px #999;transition:.2s}.switch input:checked+i{background:#6f4bd8}.switch input:checked+i:after{transform:translateX(18px)}.modal-open{overflow:hidden}.trackit-modal-overlay{position:fixed;inset:0;z-index:1000;display:grid;align-items:end}.trackit-modal-backdrop{position:absolute;inset:0;background:rgba(20,15,30,.28);backdrop-filter:blur(5px)}.trackit-modal{position:relative;background:#fff;border-radius:26px 26px 0 0;padding:22px;max-height:88vh;overflow:auto;box-shadow:0 -10px 40px rgba(30,20,50,.16)}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}.modal-head small{letter-spacing:.08em;color:#777}.modal-head h2{margin:4px 0 0}.modal-close{border:0;background:#f0edf4;border-radius:50%;width:36px;height:36px;font-size:22px}.picker-list{display:grid;gap:8px}.picker-option{display:flex;justify-content:space-between;align-items:center;width:100%;padding:16px;border:0;background:#f7f5fa;border-radius:16px;text-align:left;font-size:1rem}.modal-actions{display:flex;gap:8px;justify-content:flex-start;margin-top:18px}.danger-action{border:0;border-radius:12px;padding:11px 15px;background:#fdeceb;color:#b42318}.trackit-modal label{display:block;font-size:.86rem;color:#666;margin:12px 0}.trackit-modal input,.trackit-modal select{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:13px;border:1px solid #ddd8e4;border-radius:12px;font:inherit;background:#fff}.trackit-modal .primary-action{border:0;border-radius:12px;padding:12px 16px;background:#6f4bd8;color:#fff}.empty-state{padding:24px;text-align:center;color:#888}.tx-amount.expense{color:#b42318}.tx-amount.income{color:#207a45}.tx-amount.transfer{color:#6f4bd8}#trackitToast{position:fixed;left:50%;bottom:88px;transform:translate(-50%,20px);opacity:0;pointer-events:none;background:#211d27;color:#fff;padding:11px 16px;border-radius:999px;z-index:1200;transition:.2s}#trackitToast.show{opacity:1;transform:translate(-50%,0)}@media(max-width:600px){.stats-list{grid-template-columns:1fr}.settings-actions button{flex:1}.trackit-modal{padding:18px}.setting-row{align-items:flex-start}.setting-row>span:last-child{display:flex;align-items:center;gap:6px}}
  `;document.head.appendChild(s);}

  document.addEventListener("DOMContentLoaded",boot);
})();
