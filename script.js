/* =========================================================
   TRACKIT
   Main application logic
   ========================================================= */


/* =========================================================
   1. DEFAULT DATA
   ========================================================= */

const DEFAULT_DATA = {
    transactions: [],

    expenseCategories: [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Education",
        "Entertainment",
        "Health",
        "Other"
    ],

    incomeCategories: [
        "Salary",
        "Freelance",
        "Business",
        "Gift",
        "Interest",
        "Other"
    ],

    cashAccounts: [
        {
            id: "cash-default",
            name: "Cash",
            primary: true,
            countInStatistics: true
        }
    ],

    bankAccounts: [
        {
            id: "bank-default",
            name: "Bank",
            primary: true,
            countInStatistics: true
        }
    ]
};


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

let appData = loadData();

let currentEntry = {
    type: null,
    accountType: null,
    accountId: null,
    amount: 0
};

let editingTransactionId = null;

let managementMode = null;


/* =========================================================
   3. DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


/* =========================================================
   4. INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeIcons();

    setupNavigation();
    setupQuickEntry();
    setupAmountModal();
    setupCategoryModal();
    setupEditModal();
    setupSettings();
    setupCategoryManagement();
    setupAccountManagement();
    setupDataManagement();

    refreshApp();

});


/* =========================================================
   5. ICONS
   ========================================================= */

function initializeIcons() {

    if (window.lucide) {
        lucide.createIcons();
    }

}


/* =========================================================
   6. LOCAL STORAGE
   ========================================================= */

function loadData() {

    try {

        const saved = localStorage.getItem("trackitData");

        if (!saved) {
            return structuredClone(DEFAULT_DATA);
        }

        const parsed = JSON.parse(saved);

        return {
            ...structuredClone(DEFAULT_DATA),
            ...parsed,

            transactions: Array.isArray(parsed.transactions)
                ? parsed.transactions
                : [],

            expenseCategories:
                Array.isArray(parsed.expenseCategories)
                    ? parsed.expenseCategories
                    : [...DEFAULT_DATA.expenseCategories],

            incomeCategories:
                Array.isArray(parsed.incomeCategories)
                    ? parsed.incomeCategories
                    : [...DEFAULT_DATA.incomeCategories],

            cashAccounts:
                Array.isArray(parsed.cashAccounts)
                    ? parsed.cashAccounts
                    : structuredClone(DEFAULT_DATA.cashAccounts),

            bankAccounts:
                Array.isArray(parsed.bankAccounts)
                    ? parsed.bankAccounts
                    : structuredClone(DEFAULT_DATA.bankAccounts)
        };

    } catch (error) {

        console.error("Could not load TrackIt data:", error);

        return structuredClone(DEFAULT_DATA);
    }

}


function saveData() {

    localStorage.setItem(
        "trackitData",
        JSON.stringify(appData)
    );

}


/* =========================================================
   7. NAVIGATION
   ========================================================= */

function setupNavigation() {

    $$(".nav-item").forEach(button => {

        button.addEventListener("click", () => {

            const pageId = button.dataset.page;

            showPage(pageId);

        });

    });


    $("#viewAllButton")?.addEventListener("click", () => {
        showPage("transactionsPage");
    });

}


function showPage(pageId) {

    $$(".page").forEach(page => {
        page.classList.remove("active");
    });

    $(`#${pageId}`)?.classList.add("active");


    $$(".nav-item").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === pageId
        );

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    refreshApp();

}


/* =========================================================
   8. QUICK ENTRY
   ========================================================= */

function setupQuickEntry() {

    $$(".money-card").forEach(card => {

        card.addEventListener("click", () => {

            const type = card.dataset.type;
            const accountType = card.dataset.accountType;

            openAmountModal(type, accountType);

        });

    });

}


/* =========================================================
   9. ACCOUNT HELPERS
   ========================================================= */

function getAccounts(accountType) {

    return accountType === "cash"
        ? appData.cashAccounts
        : appData.bankAccounts;

}


function getPrimaryAccount(accountType) {

    const accounts = getAccounts(accountType);

    let primary = accounts.find(account => account.primary);

    if (!primary && accounts.length > 0) {

        primary = accounts[0];
        primary.primary = true;

        saveData();
    }

    return primary || null;

}


function getAccountById(accountType, accountId) {

    return getAccounts(accountType)
        .find(account => account.id === accountId);
}


function getAccountName(accountType, accountId) {

    const account = getAccountById(
        accountType,
        accountId
    );

    return account ? account.name : "Unknown account";
}


/* =========================================================
   10. UPDATE QUICK ENTRY ACCOUNT NAMES
   ========================================================= */

function updateQuickEntryCards() {

    const cash = getPrimaryAccount("cash");
    const bank = getPrimaryAccount("bank");

    const cashName = cash ? cash.name : "Cash";
    const bankName = bank ? bank.name : "Bank";


    $("#expenseCashName").textContent = cashName;
    $("#incomeCashName").textContent = cashName;

    $("#expenseBankName").textContent = bankName;
    $("#incomeBankName").textContent = bankName;


    const cashExpenses = getAccountTotal(
        "cash",
        "expense"
    );

    const bankExpenses = getAccountTotal(
        "bank",
        "expense"
    );

    const cashIncome = getAccountTotal(
        "cash",
        "income"
    );

    const bankIncome = getAccountTotal(
        "bank",
        "income"
    );


    $("#expenseCashAmount").textContent =
        formatNumber(cashExpenses);

    $("#expenseBankAmount").textContent =
        formatNumber(bankExpenses);

    $("#incomeCashAmount").textContent =
        formatNumber(cashIncome);

    $("#incomeBankAmount").textContent =
        formatNumber(bankIncome);

}


function getAccountTotal(accountType, type) {

    const account = getPrimaryAccount(accountType);

    if (!account) return 0;

    return appData.transactions
        .filter(transaction => {

            return (
                transaction.accountType === accountType &&
                transaction.accountId === account.id &&
                transaction.type === type
            );

        })
        .reduce(
            (total, transaction) =>
                total + Number(transaction.amount),
            0
        );

}


/* =========================================================
   11. AMOUNT MODAL
   ========================================================= */

function setupAmountModal() {

    $("#closeAmountModal")?.addEventListener(
        "click",
        closeAmountModal
    );

    $("#cancelAmount")?.addEventListener(
        "click",
        closeAmountModal
    );

    $("#continueAmount")?.addEventListener(
        "click",
        continueAmount
    );


    $("#amountInput")?.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                continueAmount();

            }

        }
    );


    $("#amountModal")?.addEventListener(
        "click",
        event => {

            if (event.target === $("#amountModal")) {
                closeAmountModal();
            }

        }
    );

}


function openAmountModal(type, accountType) {

    const account = getPrimaryAccount(accountType);

    if (!account) {

        alert(
            `Please add a ${accountType} account first.`
        );

        return;
    }


    currentEntry = {
        type,
        accountType,
        accountId: account.id,
        amount: 0
    };


    $("#amountModalType").textContent =
        type === "expense"
            ? "Expense"
            : "Income";

    $("#selectedAccountName").textContent =
        account.name;

    $("#amountInput").value = "";


    openModal("#amountModal");


    setTimeout(() => {

        $("#amountInput")?.focus();

    }, 250);

}


function continueAmount() {

    const input = $("#amountInput");

    const amount = Number(input.value);

    if (!amount || amount <= 0) {

        input.focus();

        return;
    }


    currentEntry.amount = amount;

    closeModal("#amountModal");

    openCategoryModal();

}


/* =========================================================
   12. CATEGORY MODAL
   ========================================================= */

function setupCategoryModal() {

    $("#closeCategoryModal")?.addEventListener(
        "click",
        closeCategoryModal
    );

}


function openCategoryModal() {

    const categories =
        currentEntry.type === "expense"
            ? appData.expenseCategories
            : appData.incomeCategories;


    $("#categoryModalType").textContent =
        currentEntry.type === "expense"
            ? "Expense"
            : "Income";


    const grid = $("#categoryGrid");

    grid.innerHTML = "";


    categories.forEach((category, index) => {

        const button =
            document.createElement("button");

        button.className = "category-button";

        button.type = "button";

        button.innerHTML = `
            <span class="category-symbol">
                <i data-lucide="${getCategoryIcon(category)}"></i>
            </span>

            <span>${escapeHTML(category)}</span>
        `;


        button.addEventListener(
            "click",
            () => {

                createTransaction(category);

            }
        );


        grid.appendChild(button);

    });


    initializeIcons();

    openModal("#categoryModal");

}


function closeCategoryModal() {

    closeModal("#categoryModal");

}


/* =========================================================
   13. CREATE TRANSACTION
   ========================================================= */

function createTransaction(category) {

    const now = new Date();

    const transaction = {

        id:
            crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(),

        type: currentEntry.type,

        amount: Number(currentEntry.amount),

        category,

        accountType:
            currentEntry.accountType,

        accountId:
            currentEntry.accountId,

        date:
            formatDateInput(now),

        time:
            formatTimeInput(now)

    };


    appData.transactions.push(transaction);

    saveData();

    closeCategoryModal();

    refreshApp();

}


/* =========================================================
   14. DATE HELPERS
   ========================================================= */

function formatDateInput(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatTimeInput(date) {

    const hours = String(
        date.getHours()
    ).padStart(2, "0");

    const minutes = String(
        date.getMinutes()
    ).padStart(2, "0");

    return `${hours}:${minutes}`;
}


function isToday(dateString) {

    return dateString ===
        formatDateInput(new Date());

}


function isThisMonth(dateString) {

    const date = new Date(
        `${dateString}T00:00:00`
    );

    const now = new Date();

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
    );

}


/* =========================================================
   15. EDIT TRANSACTION
   ========================================================= */

function setupEditModal() {

    $("#closeEditModal")?.addEventListener(
        "click",
        () => closeModal("#editModal")
    );


    $("#saveEdit")?.addEventListener(
        "click",
        saveEditedTransaction
    );


    $("#deleteEdit")?.addEventListener(
        "click",
        deleteEditedTransaction
    );


    $("#editType")?.addEventListener(
        "change",
        updateEditCategories
    );

}


function openEditModal(transactionId) {

    const transaction =
        appData.transactions.find(
            item => item.id === transactionId
        );


    if (!transaction) return;


    editingTransactionId = transactionId;


    $("#editAmount").value =
        transaction.amount;

    $("#editType").value =
        transaction.type;

    $("#editDate").value =
        transaction.date;

    $("#editTime").value =
        transaction.time;


    updateEditCategories(
        transaction.category
    );

    updateEditAccounts(
        transaction.accountType,
        transaction.accountId
    );


    openModal("#editModal");

}


function updateEditCategories(
    selectedCategory = null
) {

    const type = $("#editType").value;

    const categories =
        type === "expense"
            ? appData.expenseCategories
            : appData.incomeCategories;


    const select = $("#editCategory");

    select.innerHTML = "";


    categories.forEach(category => {

        const option =
            document.createElement("option");

        option.value = category;
        option.textContent = category;

        select.appendChild(option);

    });


    if (selectedCategory &&
        categories.includes(selectedCategory)) {

        select.value = selectedCategory;

    }

}


function updateEditAccounts(
    accountType,
    accountId
) {

    const select = $("#editAccount");

    select.innerHTML = "";


    const allAccounts = [

        ...appData.cashAccounts.map(
            account => ({
                ...account,
                accountType: "cash"
            })
        ),

        ...appData.bankAccounts.map(
            account => ({
                ...account,
                accountType: "bank"
            })
        )

    ];


    allAccounts.forEach(account => {

        const option =
            document.createElement("option");

        option.value =
            `${account.accountType}:${account.id}`;

        option.textContent =
            account.accountType === "cash"
                ? `${account.name} · Cash`
                : `${account.name} · Bank`;

        select.appendChild(option);

    });


    if (accountType && accountId) {

        select.value =
            `${accountType}:${accountId}`;

    }

}


function saveEditedTransaction() {

    const transaction =
        appData.transactions.find(
            item => item.id === editingTransactionId
        );


    if (!transaction) return;


    const amount =
        Number($("#editAmount").value);


    if (!amount || amount <= 0) {

        alert("Please enter a valid amount.");

        return;
    }


    const accountValue =
        $("#editAccount").value;

    const [accountType, accountId] =
        accountValue.split(":");


    transaction.amount = amount;

    transaction.type =
        $("#editType").value;

    transaction.category =
        $("#editCategory").value;

    transaction.accountType =
        accountType;

    transaction.accountId =
        accountId;

    transaction.date =
        $("#editDate").value;

    transaction.time =
        $("#editTime").value;


    saveData();

    closeModal("#editModal");

    editingTransactionId = null;

    refreshApp();

}


function deleteEditedTransaction() {

    if (!editingTransactionId) return;


    const confirmed =
        confirm(
            "Delete this transaction?"
        );


    if (!confirmed) return;


    appData.transactions =
        appData.transactions.filter(
            transaction =>
                transaction.id !==
                editingTransactionId
        );


    saveData();

    closeModal("#editModal");

    editingTransactionId = null;

    refreshApp();

}


/* =========================================================
   16. RENDER TODAY'S TRANSACTIONS
   ========================================================= */

function renderTodayTransactions() {

    const list =
        $("#todayTransactionList");


    const transactions =
        getSortedTransactions()
            .filter(transaction =>
                isToday(transaction.date)
            );


    $("#todayTransactionCount").textContent =
        `${transactions.length} ${
            transactions.length === 1
                ? "transaction"
                : "transactions"
        }`;


    if (!transactions.length) {

        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i data-lucide="receipt"></i>
                </div>

                <h3>No transactions yet</h3>

                <p>
                    Your transactions will appear here.
                </p>
            </div>
        `;

        initializeIcons();

        return;
    }


    list.innerHTML = "";


    transactions.forEach(transaction => {

        list.appendChild(
            createTransactionElement(transaction)
        );

    });


    initializeIcons();

}


/* =========================================================
   17. RENDER ALL TRANSACTIONS
   ========================================================= */

function renderAllTransactions() {

    const container =
        $("#allTransactionsList");


    const transactions =
        getSortedTransactions();


    if (!transactions.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i data-lucide="receipt-text"></i>
                </div>

                <h3>No transactions</h3>

                <p>
                    Your complete transaction history
                    will appear here.
                </p>
            </div>
        `;

        initializeIcons();

        return;
    }


    container.innerHTML = "";


    const grouped = {};


    transactions.forEach(transaction => {

        if (!grouped[transaction.date]) {
            grouped[transaction.date] = [];
        }

        grouped[transaction.date].push(
            transaction
        );

    });


    Object.keys(grouped)
        .sort()
        .reverse()
        .forEach(date => {

            const group =
                document.createElement("div");

            group.className =
                "transaction-group";


            const dateTitle =
                document.createElement("div");

            dateTitle.className =
                "transaction-date";

            dateTitle.textContent =
                formatDisplayDate(date);


            group.appendChild(dateTitle);


            grouped[date].forEach(transaction => {

                group.appendChild(
                    createTransactionElement(
                        transaction
                    )
                );

            });


            container.appendChild(group);

        });


    initializeIcons();

}


/* =========================================================
   18. CREATE TRANSACTION ELEMENT
   ========================================================= */

function createTransactionElement(
    transaction
) {

    const button =
        document.createElement("button");

    button.type = "button";

    button.className =
        "transaction-item";


    const accountName =
        getAccountName(
            transaction.accountType,
            transaction.accountId
        );


    const typeIcon =
        transaction.type === "expense"
            ? "arrow-down-left"
            : "arrow-up-right";


    const sign =
        transaction.type === "expense"
            ? "−"
            : "+";


    button.innerHTML = `

        <span
            class="transaction-icon ${transaction.type}"
        >
            <i data-lucide="${typeIcon}"></i>
        </span>


        <span class="transaction-info">

            <span class="transaction-category">
                ${escapeHTML(transaction.category)}
            </span>

            <span class="transaction-meta">
                ${escapeHTML(accountName)}
                ·
                ${formatDisplayTime(transaction.time)}
            </span>

        </span>


        <span
            class="transaction-amount ${transaction.type}"
        >
            ${sign}₹${formatNumber(transaction.amount)}
        </span>

    `;


    button.addEventListener(
        "click",
        () => openEditModal(transaction.id)
    );


    return button;

}


/* =========================================================
   19. SORT TRANSACTIONS
   ========================================================= */

function getSortedTransactions() {

    return [...appData.transactions]
        .sort((a, b) => {

            const dateA =
                new Date(`${a.date}T${a.time || "00:00"}`);

            const dateB =
                new Date(`${b.date}T${b.time || "00:00"}`);

            return dateB - dateA;

        });

}


/* =========================================================
   20. DASHBOARD TOTALS
   ========================================================= */

function calculateTotals(
    transactions
) {

    let expenses = 0;
    let income = 0;


    transactions.forEach(transaction => {

        const account =
            getAccountById(
                transaction.accountType,
                transaction.accountId
            );


        if (
            account &&
            account.countInStatistics === false
        ) {
            return;
        }


        if (transaction.type === "expense") {

            expenses +=
                Number(transaction.amount);

        } else {

            income +=
                Number(transaction.amount);

        }

    });


    return {
        expenses,
        income,
        net: income - expenses
    };

}


function updateDashboardTotals() {

    const todayTransactions =
        appData.transactions.filter(
            transaction =>
                isToday(transaction.date)
        );


    const monthTransactions =
        appData.transactions.filter(
            transaction =>
                isThisMonth(transaction.date)
        );


    const today =
        calculateTotals(todayTransactions);

    const month =
        calculateTotals(monthTransactions);


    $("#todayExpenses").textContent =
        formatCurrency(today.expenses);

    $("#todayIncome").textContent =
        formatCurrency(today.income);

    $("#todayNet").textContent =
        formatCurrency(today.net);


    $("#monthExpenses").textContent =
        formatCurrency(month.expenses);

    $("#monthIncome").textContent =
        formatCurrency(month.income);

    $("#monthNet").textContent =
        formatCurrency(month.net);


    updateNetColor(
        $("#todayNet"),
        today.net
    );

    updateNetColor(
        $("#monthNet"),
        month.net
    );

}


function updateNetColor(element, value) {

    if (!element) return;

    element.style.color =
        value < 0
            ? "#d92d20"
            : "#18864b";

}


/* =========================================================
   21. STATISTICS
   ========================================================= */

function updateStatistics() {

    const monthTransactions =
        appData.transactions.filter(
            transaction =>
                isThisMonth(transaction.date)
        );


    const month =
        calculateTotals(monthTransactions);


    $("#statExpenses").textContent =
        formatCurrency(month.expenses);

    $("#statIncome").textContent =
        formatCurrency(month.income);

    $("#statNet").textContent =
        formatCurrency(month.net);


    const daysInMonth =
        new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            0
        ).getDate();


    const today =
        new Date().getDate();


    const daysElapsed =
        Math.max(today, 1);


    $("#averageExpense").textContent =
        formatCurrency(
            month.expenses / daysElapsed
        );


    $("#averageIncome").textContent =
        formatCurrency(
            month.income / daysElapsed
        );


    const countedTransactions =
        appData.transactions.filter(
            transaction => {

                const account =
                    getAccountById(
                        transaction.accountType,
                        transaction.accountId
                    );

                return (
                    !account ||
                    account.countInStatistics !== false
                );

            }
        );


    const transactionTotal =
        countedTransactions.reduce(
            (sum, transaction) =>
                sum + Number(transaction.amount),
            0
        );


    $("#averageTransaction").textContent =
        countedTransactions.length
            ? formatCurrency(
                transactionTotal /
                countedTransactions.length
            )
            : "₹0";


    $("#transactionCount").textContent =
        countedTransactions.length;


    updateHighestExpense(monthTransactions);

    updateSavingsRate(month);

    renderCategoryRanking(monthTransactions);

}


function updateHighestExpense(transactions) {

    const expenses =
        transactions.filter(
            transaction =>
                transaction.type === "expense"
        );


    if (!expenses.length) {

        $("#highestExpense").textContent =
            "₹0";

        $("#highestExpenseCategory").textContent =
            "No data";

        return;
    }


    const highest =
        expenses.reduce(
            (max, transaction) =>
                Number(transaction.amount) >
                Number(max.amount)
                    ? transaction
                    : max
        );


    $("#highestExpense").textContent =
        formatCurrency(
            Number(highest.amount)
        );

    $("#highestExpenseCategory").textContent =
        highest.category;

}


function updateSavingsRate(totals) {

    if (totals.income <= 0) {

        $("#savingsRate").textContent =
            "0%";

        return;
    }


    const rate =
        (
            totals.net /
            totals.income
        ) * 100;


    $("#savingsRate").textContent =
        `${Math.round(rate)}%`;

}


/* =========================================================
   22. CATEGORY RANKING
   ========================================================= */

function renderCategoryRanking(transactions) {

    const container =
        $("#categoryRanking");


    const expenses =
        transactions.filter(
            transaction =>
                transaction.type === "expense"
        );


    if (!expenses.length) {

        container.innerHTML = `
            <div class="empty-state compact">
                <p>No expense data yet.</p>
            </div>
        `;

        return;
    }


    const totals = {};


    expenses.forEach(transaction => {

        if (!totals[transaction.category]) {
            totals[transaction.category] = 0;
        }

        totals[transaction.category] +=
            Number(transaction.amount);

    });


    const sorted =
        Object.entries(totals)
            .sort(
                (a, b) => b[1] - a[1]
            );


    const max =
        sorted[0][1];


    const total =
        sorted.reduce(
            (sum, [, amount]) =>
                sum + amount,
            0
        );


    container.innerHTML = "";


    sorted.forEach(
        ([category, amount]) => {

            const percentage =
                (amount / max) * 100;


            const share =
                total > 0
                    ? Math.round(
                        (amount / total) * 100
                    )
                    : 0;


            const item =
                document.createElement("div");

            item.className =
                "category-rank-item";


            item.innerHTML = `

                <div class="category-rank-top">

                    <span
                        class="category-rank-name"
                    >
                        ${escapeHTML(category)}
                        · ${share}%
                    </span>

                    <span
                        class="category-rank-value"
                    >
                        ${formatCurrency(amount)}
                    </span>

                </div>


                <div class="category-rank-bar">

                    <div
                        class="category-rank-bar-fill"
                        style="width:${percentage}%"
                    ></div>

                </div>

            `;


            container.appendChild(item);

        }
    );

}


/* =========================================================
   23. SETTINGS
   ========================================================= */

function setupSettings() {

    $("#settingsButton")?.addEventListener(
        "click",
        () => openModal("#settingsModal")
    );


    $("#closeSettingsModal")?.addEventListener(
        "click",
        () => closeModal("#settingsModal")
    );


    $("#settingsModal")?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("#settingsModal")
            ) {

                closeModal("#settingsModal");

            }

        }
    );

}


/* =========================================================
   24. CATEGORY MANAGEMENT
   ========================================================= */

function setupCategoryManagement() {

    $("#expenseCategoriesButton")
        ?.addEventListener(
            "click",
            () => {

                managementMode = "expense";

                openCategoryManagement();

            }
        );


    $("#incomeCategoriesButton")
        ?.addEventListener(
            "click",
            () => {

                managementMode = "income";

                openCategoryManagement();

            }
        );


    $("#closeManageCategories")
        ?.addEventListener(
            "click",
            () => closeModal(
                "#manageCategoriesModal"
            )
        );


    $("#addCategoryButton")
        ?.addEventListener(
            "click",
            addCategory
        );


    $("#newCategoryInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    addCategory();
                }

            }
        );

}


function openCategoryManagement() {

    closeModal("#settingsModal");


    const isExpense =
        managementMode === "expense";


    $("#managementType").textContent =
        isExpense
            ? "EXPENSE"
            : "INCOME";


    $("#managementTitle").textContent =
        isExpense
            ? "Expense categories"
            : "Income categories";


    renderCategoryManagement();


    openModal(
        "#manageCategoriesModal"
    );

}


function renderCategoryManagement() {

    const container =
        $("#managementCategoryList");


    const categories =
        managementMode === "expense"
            ? appData.expenseCategories
            : appData.incomeCategories;


    container.innerHTML = "";


    categories.forEach(
        (category, index) => {

            const item =
                document.createElement("div");

            item.className =
                "management-item";


            item.innerHTML = `

                <div
                    class="management-item-main"
                >

                    <span
                        class="management-item-name"
                    >
                        ${escapeHTML(category)}
                    </span>

                </div>


                <div
                    class="management-item-actions"
                >

                    <button
                        class="small-icon-button"
                        type="button"
                        title="Rename"
                        data-action="rename"
                        data-index="${index}"
                    >
                        <i data-lucide="pencil"></i>
                    </button>


                    <button
                        class="small-icon-button delete"
                        type="button"
                        title="Delete"
                        data-action="delete"
                        data-index="${index}"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>

                </div>

            `;


            item
                .querySelector(
                    '[data-action="rename"]'
                )
                .addEventListener(
                    "click",
                    () => renameCategory(index)
                );


            item
                .querySelector(
                    '[data-action="delete"]'
                )
                .addEventListener(
                    "click",
                    () => deleteCategory(index)
                );


            container.appendChild(item);

        }
    );


    initializeIcons();

}


function addCategory() {

    const input =
        $("#newCategoryInput");


    const name =
        input.value.trim();


    if (!name) {

        input.focus();

        return;
    }


    const categories =
        managementMode === "expense"
            ? appData.expenseCategories
            : appData.incomeCategories;


    const exists =
        categories.some(
            category =>
                category.toLowerCase() ===
                name.toLowerCase()
        );


    if (exists) {

        alert("This category already exists.");

        return;
    }


    categories.push(name);

    saveData();

    input.value = "";

    renderCategoryManagement();

    refreshApp();

}


function renameCategory(index) {

    const categories =
        managementMode === "expense"
            ? appData.expenseCategories
            : appData.incomeCategories;


    const oldName =
        categories[index];


    const newName =
        prompt(
            "Rename category:",
            oldName
        );


    if (!newName) return;


    const trimmed =
        newName.trim();


    if (!trimmed) return;


    categories[index] =
        trimmed;


    appData.transactions.forEach(
        transaction => {

            const matchingType =
                managementMode === "expense"
                    ? transaction.type === "expense"
                    : transaction.type === "income";


            if (
                matchingType &&
                transaction.category === oldName
            ) {

                transaction.category =
                    trimmed;

            }

        }
    );


    saveData();

    renderCategoryManagement();

    refreshApp();

}


function deleteCategory(index) {

    const categories =
        managementMode === "expense"
            ? appData.expenseCategories
            : appData.incomeCategories;


    if (categories.length <= 1) {

        alert(
            "You need at least one category."
        );

        return;
    }


    const category =
        categories[index];


    const used =
        appData.transactions.some(
            transaction =>
                transaction.category ===
                category
        );


    if (used) {

        alert(
            "This category is already used by a transaction. Rename it instead of deleting it."
        );

        return;
    }


    const confirmed =
        confirm(
            `Delete "${category}"?`
        );


    if (!confirmed) return;


    categories.splice(index, 1);

    saveData();

    renderCategoryManagement();

    refreshApp();

}


/* =========================================================
   25. ACCOUNT MANAGEMENT
   ========================================================= */

function setupAccountManagement() {

    $("#cashAccountsButton")
        ?.addEventListener(
            "click",
            () => {

                managementMode = "cash";

                openAccountManagement();

            }
        );


    $("#bankAccountsButton")
        ?.addEventListener(
            "click",
            () => {

                managementMode = "bank";

                openAccountManagement();

            }
        );


    $("#closeManageAccounts")
        ?.addEventListener(
            "click",
            () => closeModal(
                "#manageAccountsModal"
            )
        );


    $("#addAccountButton")
        ?.addEventListener(
            "click",
            addAccount
        );


    $("#newAccountInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    addAccount();
                }

            }
        );

}


function openAccountManagement() {

    closeModal("#settingsModal");


    const isCash =
        managementMode === "cash";


    $("#accountManagementType").textContent =
        isCash
            ? "CASH"
            : "BANK";


    $("#accountManagementTitle").textContent =
        isCash
            ? "Cash accounts"
            : "Bank accounts";


    renderAccountManagement();


    openModal(
        "#manageAccountsModal"
    );

}


function renderAccountManagement() {

    const container =
        $("#managementAccountList");


    const accounts =
        getAccounts(managementMode);


    container.innerHTML = "";


    accounts.forEach(
        (account, index) => {

            const item =
                document.createElement("div");

            item.className =
                "management-item";


            item.innerHTML = `

                <div
                    class="management-item-main"
                >

                    <span
                        class="management-item-name"
                    >
                        ${escapeHTML(account.name)}
                    </span>

                    <span
                        class="management-item-subtitle"
                    >
                        ${
                            account.primary
                                ? "Primary account"
                                : "Tap star to make primary"
                        }

                        ·

                        ${
                            account.countInStatistics !== false
                                ? "Included in statistics"
                                : "Excluded from statistics"
                        }

                    </span>

                </div>


                <div
                    class="management-item-actions"
                >

                    <button
                        class="small-icon-button"
                        type="button"
                        title="Set primary"
                        data-action="primary"
                        data-index="${index}"
                    >
                        <i
                            data-lucide="${
                                account.primary
                                    ? "star"
                                    : "star"
                            }"
                        ></i>
                    </button>


                    <button
                        class="small-icon-button"
                        type="button"
                        title="Statistics"
                        data-action="statistics"
                        data-index="${index}"
                    >
                        <i
                            data-lucide="${
                                account.countInStatistics !== false
                                    ? "eye"
                                    : "eye-off"
                            }"
                        ></i>
                    </button>


                    <button
                        class="small-icon-button"
                        type="button"
                        title="Rename"
                        data-action="rename"
                        data-index="${index}"
                    >
                        <i data-lucide="pencil"></i>
                    </button>


                    <button
                        class="small-icon-button delete"
                        type="button"
                        title="Delete"
                        data-action="delete"
                        data-index="${index}"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>

                </div>

            `;


            item
                .querySelector(
                    '[data-action="primary"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        setPrimaryAccount(index)
                );


            item
                .querySelector(
                    '[data-action="statistics"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        toggleAccountStatistics(index)
                );


            item
                .querySelector(
                    '[data-action="rename"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        renameAccount(index)
                );


            item
                .querySelector(
                    '[data-action="delete"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        deleteAccount(index)
                );


            container.appendChild(item);

        }
    );


    initializeIcons();

}


function addAccount() {

    const input =
        $("#newAccountInput");


    const name =
        input.value.trim();


    if (!name) {

        input.focus();

        return;
    }


    const accounts =
        getAccounts(managementMode);


    const exists =
        accounts.some(
            account =>
                account.name.toLowerCase() ===
                name.toLowerCase()
        );


    if (exists) {

        alert("This account already exists.");

        return;
    }


    accounts.push({

        id:
            crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,

        name,

        primary:
            accounts.length === 0,

        countInStatistics: true

    });


    saveData();

    input.value = "";

    renderAccountManagement();

    refreshApp();

}


function setPrimaryAccount(index) {

    const accounts =
        getAccounts(managementMode);


    accounts.forEach(
        (account, accountIndex) => {

            account.primary =
                accountIndex === index;

        }
    );


    saveData();

    renderAccountManagement();

    refreshApp();

}


function toggleAccountStatistics(index) {

    const accounts =
        getAccounts(managementMode);


    accounts[index].countInStatistics =
        accounts[index].countInStatistics === false;


    saveData();

    renderAccountManagement();

    refreshApp();

}


function renameAccount(index) {

    const accounts =
        getAccounts(managementMode);


    const account =
        accounts[index];


    const oldName =
        account.name;


    const newName =
        prompt(
            "Rename account:",
            oldName
        );


    if (!newName) return;


    const trimmed =
        newName.trim();


    if (!trimmed) return;


    const exists =
        accounts.some(
            (item, itemIndex) =>
                itemIndex !== index &&
                item.name.toLowerCase() ===
                trimmed.toLowerCase()
        );


    if (exists) {

        alert("This account already exists.");

        return;
    }


    account.name =
        trimmed;


    saveData();

    renderAccountManagement();

    refreshApp();

}


function deleteAccount(index) {

    const accounts =
        getAccounts(managementMode);


    if (accounts.length <= 1) {

        alert(
            "You need at least one account."
        );

        return;
    }


    const account =
        accounts[index];


    const used =
        appData.transactions.some(
            transaction =>
                transaction.accountId ===
                    account.id &&
                transaction.accountType ===
                    managementMode
        );


    if (used) {

        alert(
            "This account is already used by a transaction. Rename it instead of deleting it."
        );

        return;
    }


    const confirmed =
        confirm(
            `Delete "${account.name}"?`
        );


    if (!confirmed) return;


    accounts.splice(index, 1);


    if (
        account.primary &&
        accounts.length > 0
    ) {

        accounts[0].primary = true;

    }


    saveData();

    renderAccountManagement();

    refreshApp();

}


/* =========================================================
   26. DATA EXPORT / IMPORT
   ========================================================= */

function setupDataManagement() {

    $("#exportJsonButton")
        ?.addEventListener(
            "click",
            exportJSON
        );


    $("#importJsonButton")
        ?.addEventListener(
            "click",
            () => {

                $("#jsonFileInput").click();

            }
        );


    $("#jsonFileInput")
        ?.addEventListener(
            "change",
            importJSON
        );


    $("#exportPdfButton")
        ?.addEventListener(
            "click",
            exportPDF
        );

}


function exportJSON() {

    const data =
        JSON.stringify(
            appData,
            null,
            2
        );


    const blob =
        new Blob(
            [data],
            {
                type: "application/json"
            }
        );


    downloadBlob(
        blob,
        `trackit-backup-${formatDateInput(new Date())}.json`
    );

}


function importJSON(event) {

    const file =
        event.target.files[0];


    if (!file) return;


    const reader =
        new FileReader();


    reader.onload = () => {

        try {

            const imported =
                JSON.parse(
                    reader.result
                );


            if (
                !imported ||
                !Array.isArray(
                    imported.transactions
                )
            ) {

                throw new Error(
                    "Invalid TrackIt backup."
                );

            }


            const confirmed =
                confirm(
                    "Importing this backup will replace your current TrackIt data. Continue?"
                );


            if (!confirmed) return;


            appData = {

                ...structuredClone(
                    DEFAULT_DATA
                ),

                ...imported

            };


            saveData();

            refreshApp();


            alert(
                "TrackIt data imported successfully."
            );


        } catch (error) {

            console.error(error);

            alert(
                "This file is not a valid TrackIt JSON backup."
            );

        }

    };


    reader.readAsText(file);


    event.target.value = "";

}


/* =========================================================
   27. PDF EXPORT
   ========================================================= */

function exportPDF() {

    /*
       This creates a print-friendly statement.

       Browser print dialog allows:
       Save as PDF
    */


    const monthTransactions =
        appData.transactions.filter(
            transaction =>
                isThisMonth(transaction.date)
        );


    const totals =
        calculateTotals(
            monthTransactions
        );


    const rows =
        getSortedTransactions()
            .map(transaction => {

                const account =
                    getAccountName(
                        transaction.accountType,
                        transaction.accountId
                    );


                return `
                    <tr>
                        <td>
                            ${formatDisplayDate(transaction.date)}
                        </td>

                        <td>
                            ${escapeHTML(transaction.category)}
                        </td>

                        <td>
                            ${escapeHTML(account)}
                        </td>

                        <td>
                            ${transaction.type === "income"
                                ? "Income"
                                : "Expense"}
                        </td>

                        <td>
                            ₹${formatNumber(transaction.amount)}
                        </td>
                    </tr>
                `;

            })
            .join("");


    const averageExpense =
        monthTransactions.length
            ? totals.expenses /
              Math.max(
                  new Date().getDate(),
                  1
              )
            : 0;


    const averageIncome =
        monthTransactions.length
            ? totals.income /
              Math.max(
                  new Date().getDate(),
                  1
              )
            : 0;


    const pdfWindow =
        window.open(
            "",
            "_blank"
        );


    if (!pdfWindow) {

        alert(
            "Please allow pop-ups to export the statement."
        );

        return;
    }


    pdfWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>TrackIt Statement</title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 40px;

                    color: #1d1d1f;

                    font-family:
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }

                h1 {
                    margin: 0 0 5px;

                    font-size: 28px;
                }

                .subtitle {
                    color: #777;

                    font-size: 12px;
                }

                .summary {
                    display: grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 12px;

                    margin: 30px 0;
                }

                .summary-card {
                    padding: 18px;

                    border: 1px solid #ddd;

                    border-radius: 12px;
                }

                .summary-card span {
                    display: block;

                    color: #777;

                    font-size: 11px;
                }

                .summary-card strong {
                    display: block;

                    margin-top: 8px;

                    font-size: 20px;
                }

                h2 {
                    margin-top: 35px;

                    font-size: 18px;
                }

                .averages {
                    display: grid;

                    grid-template-columns:
                        repeat(2, 1fr);

                    gap: 12px;
                }

                .average {
                    padding: 15px;

                    border: 1px solid #ddd;

                    border-radius: 12px;
                }

                .average span {
                    display: block;

                    color: #777;

                    font-size: 11px;
                }

                .average strong {
                    display: block;

                    margin-top: 5px;

                    font-size: 16px;
                }

                table {
                    width: 100%;

                    margin-top: 15px;

                    border-collapse: collapse;

                    font-size: 11px;
                }

                th,
                td {
                    padding: 9px;

                    border-bottom:
                        1px solid #ddd;

                    text-align: left;
                }

                th {
                    background: #f5f5f7;
                }

                @media print {

                    body {
                        padding: 20px;
                    }

                }

            </style>

        </head>


        <body>

            <h1>TrackIt</h1>

            <div class="subtitle">
                Personal finance statement
                · Generated ${formatDisplayDate(
                    formatDateInput(new Date())
                )}
            </div>


            <div class="summary">

                <div class="summary-card">
                    <span>Expenses</span>
                    <strong>
                        ₹${formatNumber(totals.expenses)}
                    </strong>
                </div>

                <div class="summary-card">
                    <span>Income</span>
                    <strong>
                        ₹${formatNumber(totals.income)}
                    </strong>
                </div>

                <div class="summary-card">
                    <span>Net</span>
                    <strong>
                        ₹${formatNumber(totals.net)}
                    </strong>
                </div>

            </div>


            <h2>Daily averages</h2>

            <div class="averages">

                <div class="average">

                    <span>
                        Average daily expense
                    </span>

                    <strong>
                        ₹${formatNumber(averageExpense)}
                    </strong>

                </div>


                <div class="average">

                    <span>
                        Average daily income
                    </span>

                    <strong>
                        ₹${formatNumber(averageIncome)}
                    </strong>

                </div>

            </div>


            <h2>Transactions</h2>

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Category</th>
                        <th>Account</th>
                        <th>Type</th>
                        <th>Amount</th>

                    </tr>

                </thead>


                <tbody>

                    ${rows}

                </tbody>

            </table>


            <script>

                window.onload = function() {

                    window.print();

                };

            <\/script>

        </body>

        </html>

    `);


    pdfWindow.document.close();

}


/* =========================================================
   28. GENERAL MODAL FUNCTIONS
   ========================================================= */

function openModal(selector) {

    const modal =
        $(selector);


    if (!modal) return;


    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";

}


function closeModal(selector) {

    const modal =
        $(selector);


    if (!modal) return;


    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    if (
        !document.querySelector(
            ".modal-overlay.active"
        )
    ) {

        document.body.style.overflow =
            "";

    }

}


/* =========================================================
   29. FORMATTERS
   ========================================================= */

function formatNumber(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    ).format(
        Number(value) || 0
    );

}


function formatCurrency(value) {

    return `₹${formatNumber(value)}`;

}


function formatDisplayDate(dateString) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    const today =
        new Date();


    const yesterday =
        new Date();


    yesterday.setDate(
        yesterday.getDate() - 1
    );


    if (
        dateString ===
        formatDateInput(today)
    ) {

        return "Today";

    }


    if (
        dateString ===
        formatDateInput(yesterday)
    ) {

        return "Yesterday";

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


function formatDisplayTime(time) {

    if (!time) return "";

    const [hours, minutes] =
        time.split(":");


    const date =
        new Date();


    date.setHours(
        Number(hours),
        Number(minutes)
    );


    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   30. CATEGORY ICONS
   ========================================================= */

function getCategoryIcon(category) {

    const name =
        category.toLowerCase();


    if (
        name.includes("food") ||
        name.includes("meal") ||
        name.includes("restaurant")
    ) {
        return "utensils";
    }


    if (
        name.includes("transport") ||
        name.includes("travel") ||
        name.includes("fuel")
    ) {
        return "car-front";
    }


    if (
        name.includes("shopping") ||
        name.includes("shop")
    ) {
        return "shopping-bag";
    }


    if (
        name.includes("bill") ||
        name.includes("electric")
    ) {
        return "receipt";
    }


    if (
        name.includes("education") ||
        name.includes("school") ||
        name.includes("course")
    ) {
        return "book-open";
    }


    if (
        name.includes("entertainment") ||
        name.includes("movie")
    ) {
        return "film";
    }


    if (
        name.includes("health") ||
        name.includes("medical")
    ) {
        return "heart-pulse";
    }


    if (
        name.includes("salary")
    ) {
        return "briefcase-business";
    }


    if (
        name.includes("freelance") ||
        name.includes("business")
    ) {
        return "laptop";
    }


    if (
        name.includes("gift")
    ) {
        return "gift";
    }


    if (
        name.includes("interest")
    ) {
        return "percent";
    }


    return "circle";
}


/* =========================================================
   31. ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   32. DOWNLOAD HELPER
   ========================================================= */

function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();


    setTimeout(
        () => URL.revokeObjectURL(url),
        1000
    );

}


/* =========================================================
   33. REFRESH EVERYTHING
   ========================================================= */

function refreshApp() {

    updateQuickEntryCards();

    updateDashboardTotals();

    renderTodayTransactions();

    renderAllTransactions();

    updateStatistics();

    initializeIcons();

}
