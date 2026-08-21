/* =========================================================
   TRACKIT — SCRIPT.JS
   Expense • Income • Transfer • Savings • Investments
   ========================================================= */


/* =========================================================
   01. STORAGE
   ========================================================= */

const STORAGE_KEY = "trackit_data_v1";


const defaultData = {
    settings: {
        expenseCategories: [
            "Food",
            "Travel",
            "Shopping",
            "Bills",
            "Education",
            "Health",
            "Entertainment",
            "Other"
        ],

        incomeCategories: [
            "Salary",
            "Freelance",
            "Business",
            "Interest",
            "Gift",
            "Other"
        ],

        cashAccounts: [
            {
                id: "cash-primary",
                name: "Cash",
                balance: 0,
                primary: true,
                countInStats: true
            }
        ],

        bankAccounts: [
            {
                id: "bank-primary",
                name: "Bank",
                balance: 0,
                primary: true,
                countInStats: true
            }
        ],

        investments: [],

        savings: [],

        statisticAccounts: {
            cash: true,
            bank: true,
            investments: true,
            savings: true
        }
    },

    transactions: []
};


let data = loadData();


/* =========================================================
   02. DATA HELPERS
   ========================================================= */

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return structuredClone(defaultData);
        }

        const parsed = JSON.parse(saved);

        return mergeDefaults(parsed);
    } catch (error) {
        console.error("TrackIt data could not be loaded:", error);

        return structuredClone(defaultData);
    }
}


function mergeDefaults(saved) {
    const fresh = structuredClone(defaultData);

    return {
        ...fresh,
        ...saved,

        settings: {
            ...fresh.settings,
            ...(saved.settings || {}),

            expenseCategories:
                saved.settings?.expenseCategories ||
                fresh.settings.expenseCategories,

            incomeCategories:
                saved.settings?.incomeCategories ||
                fresh.settings.incomeCategories,

            cashAccounts:
                saved.settings?.cashAccounts ||
                fresh.settings.cashAccounts,

            bankAccounts:
                saved.settings?.bankAccounts ||
                fresh.settings.bankAccounts,

            investments:
                saved.settings?.investments ||
                fresh.settings.investments,

            savings:
                saved.settings?.savings ||
                fresh.settings.savings,

            statisticAccounts: {
                ...fresh.settings.statisticAccounts,
                ...(saved.settings?.statisticAccounts || {})
            }
        },

        transactions: Array.isArray(saved.transactions)
            ? saved.transactions
            : []
    };
}


function saveData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}


/* =========================================================
   03. GENERAL HELPERS
   ========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);


const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


function uid(prefix = "id") {
    return (
        prefix +
        "-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}


function money(value) {
    const number = Number(value) || 0;

    return "₹" +
        number.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
}


function numberValue(value) {
    return Number(
        String(value)
            .replace(/,/g, "")
            .replace(/[^\d.-]/g, "")
    ) || 0;
}


function todayISO() {
    const date = new Date();

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function monthKey(dateString) {
    return String(dateString).slice(0, 7);
}


function isToday(dateString) {
    return dateString === todayISO();
}


function isThisMonth(dateString) {
    return monthKey(dateString) ===
        monthKey(todayISO());
}


function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(
        dateString + "T00:00:00"
    );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}


function formatShortDate(dateString) {
    if (!dateString) return "";

    const date = new Date(
        dateString + "T00:00:00"
    );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short"
        }
    );
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   04. ICON HELPER
   Uses Lucide if available.
   ========================================================= */

function icon(name, size = 18) {
    return `
        <i
            data-lucide="${name}"
            style="width:${size}px;height:${size}px"
        ></i>
    `;
}


function refreshIcons() {
    if (
        window.lucide &&
        typeof window.lucide.createIcons === "function"
    ) {
        window.lucide.createIcons();
    }
}


/* =========================================================
   05. INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


function init() {

    setupNavigation();

    setupQuickInputs();

    setupSwipeDelete();

    setupGlobalButtons();

    setupSettings();

    setupImportExport();

    setupOverlay();

    renderEverything();

    updateHeaderDate();

    refreshIcons();
}


/* =========================================================
   06. HEADER DATE
   ========================================================= */

function updateHeaderDate() {
    const element =
        $("#headerDate, .header-date");

    if (!element) return;

    const today = new Date();

    element.textContent =
        today.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        );
}


/* =========================================================
   07. NAVIGATION
   ========================================================= */

function setupNavigation() {

    $$(".nav-item").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const pageName =
                    button.dataset.page;

                if (!pageName) return;

                showPage(pageName);

            }
        );

    });
}


function showPage(pageName) {

    $$(".page").forEach(page => {

        page.classList.remove("active");

    });


    const target =
        document.getElementById(pageName) ||
        $(`[data-page-content="${pageName}"]`);

    if (target) {
        target.classList.add("active");
    }


    $$(".nav-item").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    renderEverything();
}


/* =========================================================
   08. QUICK INPUTS
   ========================================================= */

function setupQuickInputs() {

    const inputs =
        $$(".amount-input, .quick-expense-input, .quick-income-input");

    inputs.forEach(input => {

        input.setAttribute(
            "inputmode",
            "decimal"
        );

        input.setAttribute(
            "pattern",
            "[0-9]*"
        );


        input.addEventListener(
            "keydown",
            event => {

                if (event.key !== "Enter") {
                    return;
                }

                event.preventDefault();

                const amount =
                    numberValue(input.value);

                if (amount <= 0) {
                    showToast(
                        "Enter an amount first"
                    );

                    return;
                }


                const type =
                    getQuickInputType(input);

                openQuickTransactionSheet(
                    type,
                    amount,
                    input
                );

            }
        );

    });
}


function getQuickInputType(input) {

    if (
        input.dataset.type === "income" ||
        input.classList.contains(
            "quick-income-input"
        )
    ) {
        return "income";
    }

    return "expense";
}


/* =========================================================
   09. QUICK TRANSACTION SHEET
   ========================================================= */

function openQuickTransactionSheet(
    type,
    amount,
    sourceInput
) {

    const sheet =
        getSheet(
            type === "expense"
                ? "expenseCategorySheet"
                : "incomeCategorySheet"
        );

    if (!sheet) {

        fallbackCategorySelection(
            type,
            amount,
            sourceInput
        );

        return;
    }


    sheet.dataset.amount = amount;

    sheet.dataset.type = type;

    sheet.dataset.sourceInput =
        sourceInput?.id || "";


    renderCategorySheet(
        sheet,
        type
    );


    openSheet(sheet);

    refreshIcons();
}


function fallbackCategorySelection(
    type,
    amount,
    sourceInput
) {

    const categories =
        type === "expense"
            ? data.settings.expenseCategories
            : data.settings.incomeCategories;


    if (!categories.length) {

        showToast(
            "Add a category in Settings"
        );

        return;
    }


    openCategoryPicker(
        type,
        amount,
        sourceInput
    );
}


/* =========================================================
   10. CATEGORY SHEET
   ========================================================= */

function renderCategorySheet(
    sheet,
    type
) {

    const categories =
        type === "expense"
            ? data.settings.expenseCategories
            : data.settings.incomeCategories;


    const grid =
        $(".category-grid", sheet);

    if (!grid) return;


    grid.innerHTML =
        categories
            .map(
                (category, index) => `
                    <button
                        type="button"
                        class="category-button"
                        data-category-index="${index}"
                    >

                        <span class="category-button-icon">
                            ${icon(
                                getCategoryIcon(category),
                                16
                            )}
                        </span>

                        <span class="category-button-name">
                            ${escapeHTML(category)}
                        </span>

                    </button>
                `
            )
            .join("");


    $$(".category-button", sheet)
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset
                                .categoryIndex
                        );

                    const category =
                        categories[index];

                    const amount =
                        numberValue(
                            sheet.dataset.amount
                        );

                    addTransaction({
                        type,
                        amount,
                        category,
                        account:
                            getQuickAccount(
                                type,
                                sheet
                            )
                    });


                    closeSheet(sheet);

                }
            );

        });
}


function getCategoryIcon(category) {

    const key =
        category
            .toLowerCase()
            .trim();


    const icons = {

        food: "utensils",

        travel: "car-front",

        shopping: "shopping-bag",

        bills: "receipt",

        education: "book-open",

        health: "heart-pulse",

        entertainment: "clapperboard",

        salary: "briefcase-business",

        freelance: "laptop",

        business: "store",

        interest: "percent",

        gift: "gift",

        other: "circle-dashed"
    };


    return icons[key] || "circle-dashed";
}


/* =========================================================
   11. GET QUICK ACCOUNT
   ========================================================= */

function getQuickAccount(type, sheet) {

    const selector =
        type === "expense"
            ? $(
                "[data-expense-account]",
                sheet
            )
            : $(
                "[data-income-account]",
                sheet
            );


    if (
        selector &&
        selector.dataset.account
    ) {
        return selector.dataset.account;
    }


    const accounts =
        type === "expense"
            ? data.settings.cashAccounts
            : data.settings.cashAccounts;


    const primary =
        accounts.find(
            account => account.primary
        );


    return primary?.id || accounts[0]?.id;
}


/* =========================================================
   12. ADD TRANSACTION
   ========================================================= */

function addTransaction({
    type,
    amount,
    category,
    account,
    date = todayISO(),
    note = ""
}) {

    amount = numberValue(amount);

    if (amount <= 0) {
        showToast("Invalid amount");

        return;
    }


    const transaction = {

        id: uid("tx"),

        type,

        amount,

        category:
            category || "Other",

        account:
            account || null,

        date,

        note,

        createdAt:
            new Date().toISOString()
    };


    data.transactions.push(transaction);


    updateAccountBalance(
        transaction,
        1
    );


    saveData();

    renderEverything();

    showToast(
        type === "expense"
            ? "Expense added"
            : "Income added"
    );


    clearQuickInputs();
}


function clearQuickInputs() {

    $$(".amount-input").forEach(input => {

        input.value = "";

    });

}


/* =========================================================
   13. ACCOUNT BALANCE
   ========================================================= */

function findAccount(accountId) {

    if (!accountId) return null;


    return (
        data.settings.cashAccounts
            .find(a => a.id === accountId) ||

        data.settings.bankAccounts
            .find(a => a.id === accountId)
    );
}


function updateAccountBalance(
    transaction,
    multiplier
) {

    const account =
        findAccount(
            transaction.account
        );


    if (!account) return;


    if (transaction.type === "expense") {

        account.balance -=
            transaction.amount *
            multiplier;

    }

    else if (
        transaction.type === "income"
    ) {

        account.balance +=
            transaction.amount *
            multiplier;

    }

    else if (
        transaction.type === "transfer"
    ) {

        const from =
            findAccount(
                transaction.fromAccount
            );

        const to =
            findAccount(
                transaction.toAccount
            );


        if (from) {

            from.balance -=
                transaction.amount *
                multiplier;

        }


        if (to) {

            to.balance +=
                transaction.amount *
                multiplier;

        }

    }

}


/* =========================================================
   14. SELF TRANSFER
   ========================================================= */

function openTransferSheet() {

    const sheet =
        getSheet("transferSheet");

    if (!sheet) return;


    renderTransferAccounts(
        sheet
    );


    openSheet(sheet);

    refreshIcons();
}


function renderTransferAccounts(sheet) {

    const from =
        $(
            "[data-transfer-from]",
            sheet
        );

    const to =
        $(
            "[data-transfer-to]",
            sheet
        );


    if (from) {

        from.innerHTML =
            getAccountOptions(
                data.settings.cashAccounts,
                "Cash"
            ) +
            getAccountOptions(
                data.settings.bankAccounts,
                "Bank"
            );

    }


    if (to) {

        to.innerHTML =
            getAccountOptions(
                data.settings.cashAccounts,
                "Cash"
            ) +
            getAccountOptions(
                data.settings.bankAccounts,
                "Bank"
            );

    }


    const submit =
        $(
            "[data-transfer-submit]",
            sheet
        );


    if (
        submit &&
        !submit.dataset.bound
    ) {

        submit.dataset.bound = "true";

        submit.addEventListener(
            "click",
            () => {

                const amount =
                    numberValue(
                        $(
                            "[data-transfer-amount]",
                            sheet
                        )?.value
                    );


                const fromAccount =
                    $(
                        "[data-transfer-from]",
                        sheet
                    )?.value;


                const toAccount =
                    $(
                        "[data-transfer-to]",
                        sheet
                    )?.value;


                if (amount <= 0) {

                    showToast(
                        "Enter an amount"
                    );

                    return;
                }


                if (
                    !fromAccount ||
                    !toAccount
                ) {

                    showToast(
                        "Select both accounts"
                    );

                    return;
                }


                if (
                    fromAccount ===
                    toAccount
                ) {

                    showToast(
                        "Choose different accounts"
                    );

                    return;
                }


                addTransfer(
                    fromAccount,
                    toAccount,
                    amount
                );


                closeSheet(sheet);

            }
        );
    }
}


function getAccountOptions(
    accounts,
    group
) {

    return accounts
        .map(
            account =>
                `<option value="${account.id}">
                    ${escapeHTML(
                        group +
                        " • " +
                        account.name
                    )}
                </option>`
        )
        .join("");
}


function addTransfer(
    fromAccount,
    toAccount,
    amount
) {

    const transaction = {

        id: uid("tx"),

        type: "transfer",

        amount,

        category: "Self Transfer",

        fromAccount,

        toAccount,

        account: fromAccount,

        date: todayISO(),

        note: "",

        createdAt:
            new Date().toISOString()
    };


    data.transactions.push(
        transaction
    );


    updateAccountBalance(
        transaction,
        1
    );


    saveData();

    renderEverything();

    showToast(
        "Transfer completed"
    );
}


/* =========================================================
   15. TRANSACTION DELETE
   ========================================================= */

function deleteTransaction(id) {

    const index =
        data.transactions.findIndex(
            tx => tx.id === id
        );


    if (index === -1) return;


    const transaction =
        data.transactions[index];


    updateAccountBalance(
        transaction,
        -1
    );


    data.transactions.splice(
        index,
        1
    );


    saveData();

    renderEverything();

    showToast(
        "Transaction deleted"
    );
}


/* =========================================================
   16. TRANSACTION EDIT
   ========================================================= */

function editTransaction(id) {

    const transaction =
        data.transactions.find(
            tx => tx.id === id
        );


    if (!transaction) return;


    openEditTransactionSheet(
        transaction
    );
}


function openEditTransactionSheet(
    transaction
) {

    const sheet =
        getSheet(
            "editTransactionSheet"
        );


    if (!sheet) {

        showToast(
            "Edit sheet not found"
        );

        return;
    }


    sheet.dataset.id =
        transaction.id;


    const amount =
        $(
            "[data-edit-amount]",
            sheet
        );


    const category =
        $(
            "[data-edit-category]",
            sheet
        );


    const date =
        $(
            "[data-edit-date]",
            sheet
        );


    const note =
        $(
            "[data-edit-note]",
            sheet
        );


    if (amount)
        amount.value =
            transaction.amount;


    if (category)
        category.value =
            transaction.category;


    if (date)
        date.value =
            transaction.date;


    if (note)
        note.value =
            transaction.note || "";


    populateEditCategories(
        sheet,
        transaction.type
    );


    openSheet(sheet);

    refreshIcons();
}


function populateEditCategories(
    sheet,
    type
) {

    const select =
        $(
            "[data-edit-category]",
            sheet
        );


    if (!select) return;


    const categories =
        type === "income"
            ? data.settings.incomeCategories
            : data.settings.expenseCategories;


    select.innerHTML =
        categories
            .map(
                category =>
                    `<option value="${escapeHTML(
                        category
                    )}">
                        ${escapeHTML(
                            category
                        )}
                    </option>`
            )
            .join("");
}


function saveEditedTransaction() {

    const sheet =
        getSheet(
            "editTransactionSheet"
        );


    if (!sheet) return;


    const id =
        sheet.dataset.id;


    const transaction =
        data.transactions.find(
            tx => tx.id === id
        );


    if (!transaction) return;


    updateAccountBalance(
        transaction,
        -1
    );


    const amount =
        numberValue(
            $(
                "[data-edit-amount]",
                sheet
            )?.value
        );


    if (amount <= 0) {

        updateAccountBalance(
            transaction,
            1
        );

        showToast(
            "Invalid amount"
        );

        return;
    }


    transaction.amount =
        amount;


    transaction.category =
        $(
            "[data-edit-category]",
            sheet
        )?.value ||
        transaction.category;


    transaction.date =
        $(
            "[data-edit-date]",
            sheet
        )?.value ||
        transaction.date;


    transaction.note =
        $(
            "[data-edit-note]",
            sheet
        )?.value ||
        "";


    updateAccountBalance(
        transaction,
        1
    );


    saveData();

    renderEverything();

    closeSheet(sheet);

    showToast(
        "Transaction updated"
    );
}


/* =========================================================
   17. SWIPE TO DELETE
   ========================================================= */

function setupSwipeDelete() {

    document.addEventListener(
        "pointerdown",
        startSwipe
    );

}


let swipeState = null;


function startSwipe(event) {

    const row =
        event.target.closest(
            ".transaction-row"
        );


    if (!row) return;


    swipeState = {

        row,

        startX:
            event.clientX,

        startY:
            event.clientY,

        currentX:
            event.clientX,

        moved: false

    };


    row.setPointerCapture?.(
        event.pointerId
    );


    row.addEventListener(
        "pointermove",
        moveSwipe
    );


    row.addEventListener(
        "pointerup",
        endSwipe,
        {
            once: true
        }
    );

}


function moveSwipe(event) {

    if (!swipeState) return;


    const dx =
        event.clientX -
        swipeState.startX;


    const dy =
        event.clientY -
        swipeState.startY;


    if (
        Math.abs(dy) >
        Math.abs(dx)
    ) {
        return;
    }


    if (dx >= 0) return;


    swipeState.moved = true;

    swipeState.currentX =
        event.clientX;


    const distance =
        Math.max(
            -95,
            dx
        );


    swipeState.row.style.transform =
        `translateX(${distance}px)`;
}


function endSwipe(event) {

    if (!swipeState) return;


    const state =
        swipeState;


    const dx =
        state.currentX -
        state.startX;


    state.row.removeEventListener(
        "pointermove",
        moveSwipe
    );


    if (dx < -70) {

        const wrapper =
            state.row.closest(
                ".transaction-row-wrapper"
            );


        const id =
            state.row.dataset.id;


        state.row.style.transform =
            "translateX(-100%)";


        setTimeout(
            () => {

                if (id) {
                    deleteTransaction(id);
                }

            },
            180
        );

    }

    else {

        state.row.style.transform =
            "";

    }


    swipeState = null;
}


/* =========================================================
   18. DASHBOARD RENDER
   ========================================================= */

function renderDashboard() {

    const todayExpenses =
        data.transactions
            .filter(
                tx =>
                    tx.type === "expense" &&
                    isToday(tx.date)
            )
            .reduce(
                (sum, tx) =>
                    sum + tx.amount,
                0
            );


    const todayIncome =
        data.transactions
            .filter(
                tx =>
                    tx.type === "income" &&
                    isToday(tx.date)
            )
            .reduce(
                (sum, tx) =>
                    sum + tx.amount,
                0
            );


    const monthExpenses =
        data.transactions
            .filter(
                tx =>
                    tx.type === "expense" &&
                    isThisMonth(tx.date)
            )
            .reduce(
                (sum, tx) =>
                    sum + tx.amount,
                0
            );


    const monthIncome =
        data.transactions
            .filter(
                tx =>
                    tx.type === "income" &&
                    isThisMonth(tx.date)
            )
            .reduce(
                (sum, tx) =>
                    sum + tx.amount,
                0
            );


    setText(
        [
            "#todayExpense",
            "[data-today-expense]"
        ],
        money(todayExpenses)
    );


    setText(
        [
            "#todayIncome",
            "[data-today-income]"
        ],
        money(todayIncome)
    );


    setText(
        [
            "#monthExpense",
            "[data-month-expense]"
        ],
        money(monthExpenses)
    );


    setText(
        [
            "#monthIncome",
            "[data-month-income]"
        ],
        money(monthIncome)
    );


    setText(
        [
            "#netToday",
            "[data-net-today]"
        ],
        money(
            todayIncome -
            todayExpenses
        )
    );


    renderTodayTransactions();

    renderInvestmentSummary();

    renderSavingsSummary();
}


/* =========================================================
   19. SET TEXT HELPER
   ========================================================= */

function setText(
    selectors,
    value
) {

    for (const selector of selectors) {

        const element =
            $(selector);

        if (element) {

            element.textContent =
                value;

            return;
        }
    }
}


/* =========================================================
   20. TODAY TRANSACTIONS
   ========================================================= */

function renderTodayTransactions() {

    const container =
        $(
            "#todayTransactions, " +
            "[data-today-transactions]"
        );


    if (!container) return;


    const transactions =
        data.transactions
            .filter(
                tx =>
                    tx.date === todayISO()
            )
            .sort(
                (a, b) =>
                    b.createdAt.localeCompare(
                        a.createdAt
                    )
            );


    container.innerHTML =
        transactions.length
            ? transactions
                .map(
                    transactionHTML
                )
                .join("")
            : emptyTransactionHTML();


    bindTransactionRows(
        container
    );


    refreshIcons();
}


/* =========================================================
   21. ALL TRANSACTIONS
   ========================================================= */

function renderAllTransactions() {

    const container =
        $(
            "#allTransactions, " +
            "[data-all-transactions]"
        );


    if (!container) return;


    const sorted =
        [...data.transactions]
            .sort(
                (a, b) =>
                    b.date.localeCompare(
                        a.date
                    ) ||
                    b.createdAt.localeCompare(
                        a.createdAt
                    )
            );


    if (!sorted.length) {

        container.innerHTML =
            emptyTransactionHTML();

        return;
    }


    const groups = {};


    sorted.forEach(tx => {

        if (!groups[tx.date]) {

            groups[tx.date] = [];

        }

        groups[tx.date].push(tx);

    });


    container.innerHTML =
        Object.entries(groups)
            .map(
                ([date, transactions]) =>
                    `
                    <div class="transaction-group">

                        <div class="transaction-date-heading">
                            ${escapeHTML(
                                formatDate(date)
                            )}
                        </div>

                        <div class="all-transactions-list">

                            ${transactions
                                .map(
                                    transactionHTML
                                )
                                .join("")}

                        </div>

                    </div>
                    `
            )
            .join("");


    bindTransactionRows(
        container
    );


    refreshIcons();
}


function transactionHTML(tx) {

    let iconName =
        "arrow-down-left";


    if (tx.type === "income") {

        iconName =
            "arrow-up-right";

    }

    else if (
        tx.type === "transfer"
    ) {

        iconName =
            "arrow-right-left";

    }


    let title =
        tx.category;


    if (tx.type === "transfer") {

        const from =
            findAccount(
                tx.fromAccount
            );

        const to =
            findAccount(
                tx.toAccount
            );


        title =
            `${from?.name || "Account"} → ${
                to?.name || "Account"
            }`;

    }


    const amountPrefix =
        tx.type === "expense"
            ? "−"
            : tx.type === "income"
                ? "+"
                : "";


    const account =
        findAccount(
            tx.account
        );


    return `
        <div class="transaction-row-wrapper">

            <div class="transaction-delete-background">
                Delete
            </div>

            <button
                type="button"
                class="transaction-row"
                data-id="${tx.id}"
            >

                <span
                    class="transaction-icon ${tx.type}"
                >
                    ${icon(iconName, 18)}
                </span>


                <span class="transaction-info">

                    <span class="transaction-title">
                        ${escapeHTML(title)}
                    </span>

                    <span class="transaction-subtitle">

                        ${
                            tx.type === "transfer"
                                ? "Self transfer"
                                : escapeHTML(
                                    account?.name ||
                                    "Account"
                                )
                        }

                        ${
                            tx.note
                                ? " • " +
                                  escapeHTML(
                                      tx.note
                                  )
                                : ""
                        }

                    </span>

                </span>


                <span
                    class="transaction-amount ${tx.type}"
                >
                    ${amountPrefix}${money(
                        tx.amount
                    )}
                </span>

            </button>

        </div>
    `;
}


function bindTransactionRows(
    container
) {

    $$(".transaction-row", container)
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    if (
                        swipeState?.moved
                    ) {
                        return;
                    }


                    editTransaction(
                        row.dataset.id
                    );

                }
            );

        });
}


function emptyTransactionHTML() {

    return `
        <div class="empty-state">

            <div class="empty-state-icon">
                ${icon("receipt", 19)}
            </div>

            <p>
                No transactions yet
            </p>

        </div>
    `;
}


/* =========================================================
   22. STATISTICS
   ========================================================= */

function renderStatistics() {

    const includedAccounts =
        getStatisticsAccounts();


    const transactions =
        data.transactions.filter(
            tx => {

                if (
                    tx.type === "transfer"
                ) {
                    return false;
                }


                const account =
                    findAccount(
                        tx.account
                    );


                return (
                    account &&
                    includedAccounts.includes(
                        account.id
                    )
                );

            }
        );


    const expenses =
        transactions
            .filter(
                tx =>
                    tx.type === "expense"
            );


    const income =
        transactions
            .filter(
                tx =>
                    tx.type === "income"
            );


    const totalExpense =
        expenses.reduce(
            (sum, tx) =>
                sum + tx.amount,
            0
        );


    const totalIncome =
        income.reduce(
            (sum, tx) =>
                sum + tx.amount,
            0
        );


    setText(
        [
            "#statisticsTotalExpense",
            "[data-stat-total-expense]"
        ],
        money(totalExpense)
    );


    setText(
        [
            "#statisticsTotalIncome",
            "[data-stat-total-income]"
        ],
        money(totalIncome)
    );


    setText(
        [
            "#statisticsBalance",
            "[data-stat-balance]"
        ],
        money(
            totalIncome -
            totalExpense
        )
    );


    renderCategoryStatistics(
        expenses
    );


    renderIncomeStatistics(
        income
    );


    renderInsights(
        expenses,
        income
    );
}


function getStatisticsAccounts() {

    const accounts = [];


    if (
        data.settings
            .statisticAccounts
            .cash
    ) {

        accounts.push(
            ...data.settings.cashAccounts
                .map(a => a.id)
        );

    }


    if (
        data.settings
            .statisticAccounts
            .bank
    ) {

        accounts.push(
            ...data.settings.bankAccounts
                .map(a => a.id)
        );

    }


    return accounts;
}


function renderCategoryStatistics(
    expenses
) {

    const container =
        $(
            "#expenseStatistics, " +
            "[data-expense-statistics]"
        );


    if (!container) return;


    const totals = {};


    expenses.forEach(tx => {

        totals[tx.category] =
            (
                totals[tx.category] ||
                0
            ) + tx.amount;

    });


    const entries =
        Object.entries(totals)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    container.innerHTML =
        entries.length
            ? entries
                .map(
                    ([name, amount]) =>
                        `
                        <div class="statistics-row">

                            <div class="statistics-row-left">

                                <div class="statistics-row-name">
                                    ${escapeHTML(name)}
                                </div>

                                <div class="statistics-row-subtitle">
                                    ${getPercentage(
                                        amount,
                                        expenses
                                            .reduce(
                                                (
                                                    s,
                                                    tx
                                                ) =>
                                                    s +
                                                    tx.amount,
                                                0
                                            )
                                    )}% of expenses
                                </div>

                            </div>

                            <div class="statistics-row-value">
                                ${money(amount)}
                            </div>

                        </div>
                        `
                )
                .join("")
            : emptyStatisticsHTML();

}


function renderIncomeStatistics(
    income
) {

    const container =
        $(
            "#incomeStatistics, " +
            "[data-income-statistics]"
        );


    if (!container) return;


    const totals = {};


    income.forEach(tx => {

        totals[tx.category] =
            (
                totals[tx.category] ||
                0
            ) + tx.amount;

    });


    const entries =
        Object.entries(totals)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    container.innerHTML =
        entries.length
            ? entries
                .map(
                    ([name, amount]) =>
                        `
                        <div class="statistics-row">

                            <div class="statistics-row-left">

                                <div class="statistics-row-name">
                                    ${escapeHTML(name)}
                                </div>

                            </div>

                            <div class="statistics-row-value">
                                ${money(amount)}
                            </div>

                        </div>
                        `
                )
                .join("")
            : emptyStatisticsHTML();
}


function getPercentage(
    value,
    total
) {

    if (!total) return "0";

    return (
        value / total * 100
    ).toFixed(1);
}


function emptyStatisticsHTML() {

    return `
        <div class="empty-state">
            <p>No statistics yet</p>
        </div>
    `;
}


/* =========================================================
   23. INSIGHTS
   ========================================================= */

function renderInsights(
    expenses,
    income
) {

    const container =
        $(
            "#statisticsInsights, " +
            "[data-statistics-insights]"
        );


    if (!container) return;


    const expenseTotal =
        expenses.reduce(
            (sum, tx) =>
                sum + tx.amount,
            0
        );


    const incomeTotal =
        income.reduce(
            (sum, tx) =>
                sum + tx.amount,
            0
        );


    const biggestExpense =
        [...expenses]
            .sort(
                (a, b) =>
                    b.amount -
                    a.amount
            )[0];


    const biggestIncome =
        [...income]
            .sort(
                (a, b) =>
                    b.amount -
                    a.amount
            )[0];


    container.innerHTML = `

        <div class="insight-row">

            <span>
                Largest expense
            </span>

            <strong>
                ${
                    biggestExpense
                        ? escapeHTML(
                            biggestExpense.category
                        ) +
                          " • " +
                          money(
                              biggestExpense.amount
                          )
                        : "—"
                }
            </strong>

        </div>


        <div class="insight-row">

            <span>
                Largest income
            </span>

            <strong>
                ${
                    biggestIncome
                        ? escapeHTML(
                            biggestIncome.category
                        ) +
                          " • " +
                          money(
                              biggestIncome.amount
                          )
                        : "—"
                }
            </strong>

        </div>


        <div class="insight-row">

            <span>
                Transactions
            </span>

            <strong>
                ${expenses.length + income.length}
            </strong>

        </div>


        <div class="insight-row">

            <span>
                Saving rate
            </span>

            <strong>
                ${
                    incomeTotal > 0
                        ? (
                            (
                                incomeTotal -
                                expenseTotal
                            ) /
                            incomeTotal *
                            100
                        ).toFixed(1) +
                          "%"
                        : "—"
                }
            </strong>

        </div>

    `;
}


/* =========================================================
   24. INVESTMENTS
   ========================================================= */

function renderInvestmentSummary() {

    const investments =
        data.settings.investments;


    const total =
        investments.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.amount
                ),
            0
        );


    const returns =
        investments.reduce(
            (sum, item) => {

                const amount =
                    numberValue(
                        item.amount
                    );

                const percentage =
                    Number(
                        item.returnPercentage
                    ) || 0;

                return (
                    sum +
                    amount *
                    percentage /
                    100
                );

            },
            0
        );


    setText(
        [
            "#investmentTotal",
            "[data-investment-total]"
        ],
        money(total)
    );


    setText(
        [
            "#investmentReturn",
            "[data-investment-return]"
        ],
        money(returns)
    );
}


/* =========================================================
   25. SAVINGS
   ========================================================= */

function renderSavingsSummary() {

    const savings =
        data.settings.savings;


    const current =
        savings.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.current
                ),
            0
        );


    const goals =
        savings.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.goal
                ),
            0
        );


    const percentage =
        goals > 0
            ? Math.min(
                100,
                current /
                goals *
                100
            )
            : 0;


    setText(
        [
            "#savingsCurrent",
            "[data-savings-current]"
        ],
        money(current)
    );


    setText(
        [
            "#savingsGoal",
            "[data-savings-goal]"
        ],
        money(goals)
    );


    const progress =
        $(
            "#savingsProgress span, " +
            "[data-savings-progress]"
        );


    if (progress) {

        progress.style.width =
            `${percentage}%`;

    }
}


/* =========================================================
   26. SETTINGS RENDER
   ========================================================= */

function renderSettings() {

    renderCategorySettings(
        "expense"
    );

    renderCategorySettings(
        "income"
    );

    renderAccounts(
        "cash"
    );

    renderAccounts(
        "bank"
    );

    renderInvestmentSettings();

    renderSavingsSettings();

    renderStatisticToggles();
}


function renderCategorySettings(
    type
) {

    const selector =
        type === "expense"
            ? "#expenseCategories, [data-expense-categories]"
            : "#incomeCategories, [data-income-categories]";


    const container =
        $(selector);


    if (!container) return;


    const categories =
        type === "expense"
            ? data.settings.expenseCategories
            : data.settings.incomeCategories;


    container.innerHTML =
        categories
            .map(
                category =>
                    `
                    <div class="managed-row">

                        <div class="managed-row-main">

                            <div class="managed-row-title">
                                ${escapeHTML(category)}
                            </div>

                        </div>

                        <button
                            type="button"
                            class="row-icon-button"
                            data-edit-category="${escapeHTML(
                                category
                            )}"
                            data-category-type="${type}"
                        >
                            ${icon("pencil", 16)}
                        </button>

                        <button
                            type="button"
                            class="row-icon-button danger"
                            data-delete-category="${escapeHTML(
                                category
                            )}"
                            data-category-type="${type}"
                        >
                            ${icon("trash-2", 16)}
                        </button>

                    </div>
                    `
            )
            .join("");


    bindCategoryActions(
        container
    );

    refreshIcons();
}


function bindCategoryActions(
    container
) {

    $$(
        "[data-delete-category]",
        container
    )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const category =
                        button.dataset
                            .deleteCategory;

                    const type =
                        button.dataset
                            .categoryType;


                    deleteCategory(
                        type,
                        category
                    );

                }
            );

        });


    $$(
        "[data-edit-category]",
        container
    )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    editCategory(
                        button.dataset
                            .categoryType,

                        button.dataset
                            .editCategory
                    );

                }
            );

        });
}


function addCategory(type) {

    const name =
        prompt(
            type === "expense"
                ? "New expense category"
                : "New income category"
        );


    if (!name) return;


    const clean =
        name.trim();


    if (!clean) return;


    const list =
        type === "expense"
            ? data.settings.expenseCategories
            : data.settings.incomeCategories;


    if (
        list.some(
            item =>
                item.toLowerCase() ===
                clean.toLowerCase()
        )
    ) {

        showToast(
            "Category already exists"
        );

        return;
    }


    list.push(clean);


    saveData();

    renderEverything();

    showToast(
        "Category added"
    );
}


function editCategory(
    type,
    oldName
) {

    const newName =
        prompt(
            "Rename category",
            oldName
        );


    if (!newName) return;


    const clean =
        newName.trim();


    if (!clean) return;


    const list =
        type === "expense"
            ? data.settings.expenseCategories
            : data.settings.incomeCategories;


    const index =
        list.indexOf(oldName);


    if (index === -1) return;


    list[index] =
        clean;


    saveData();

    renderEverything();

    showToast(
        "Category renamed"
    );
}


function deleteCategory(
    type,
    category
) {

    const list =
        type === "expense"
            ? data.settings.expenseCategories
            : data.settings.incomeCategories;


    if (list.length <= 1) {

        showToast(
            "Keep at least one category"
        );

        return;
    }


    const used =
        data.transactions.some(
            tx =>
                tx.category ===
                category
        );


    if (used) {

        const confirmDelete =
            confirm(
                `"${category}" is already used by transactions. Delete the category anyway?`
            );


        if (!confirmDelete) return;
    }


    const index =
        list.indexOf(category);


    if (index !== -1) {

        list.splice(
            index,
            1
        );

    }


    saveData();

    renderEverything();

    showToast(
        "Category deleted"
    );
}


/* =========================================================
   27. ACCOUNTS
   ========================================================= */

function renderAccounts(
    type
) {

    const selector =
        type === "cash"
            ? "#cashAccounts, [data-cash-accounts]"
            : "#bankAccounts, [data-bank-accounts]";


    const container =
        $(selector);


    if (!container) return;


    const accounts =
        type === "cash"
            ? data.settings.cashAccounts
            : data.settings.bankAccounts;


    container.innerHTML =
        accounts
            .map(
                account =>
                    `
                    <div class="settings-account-row">

                        <div class="settings-account-info">

                            <div class="settings-account-name">
                                ${escapeHTML(
                                    account.name
                                )}
                            </div>

                            <div class="settings-account-meta">
                                ${money(
                                    account.balance
                                )}
                            </div>

                        </div>

                        ${
                            account.primary
                                ? `
                                    <span class="primary-badge">
                                        Primary
                                    </span>
                                `
                                : `
                                    <button
                                        type="button"
                                        class="row-icon-button"
                                        data-primary-account="${account.id}"
                                        data-account-type="${type}"
                                        title="Make primary"
                                    >
                                        ${icon(
                                            "star",
                                            16
                                        )}
                                    </button>
                                `
                        }

                        <button
                            type="button"
                            class="row-icon-button"
                            data-edit-account="${account.id}"
                            data-account-type="${type}"
                        >
                            ${icon("pencil", 16)}
                        </button>

                        ${
                            accounts.length > 1
                                ? `
                                    <button
                                        type="button"
                                        class="row-icon-button danger"
                                        data-delete-account="${account.id}"
                                        data-account-type="${type}"
                                    >
                                        ${icon(
                                            "trash-2",
                                            16
                                        )}
                                    </button>
                                `
                                : ""
                        }

                    </div>
                    `
            )
            .join("");


    bindAccountActions(
        container
    );

    refreshIcons();
}


function bindAccountActions(
    container
) {

    $$(
        "[data-primary-account]",
        container
    )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    setPrimaryAccount(
                        button.dataset
                            .accountType,

                        button.dataset
                            .primaryAccount
                    );

                }
            );

        });


    $$(
        "[data-edit-account]",
        container
    )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    editAccount(
                        button.dataset
                            .accountType,

                        button.dataset
                            .editAccount
                    );

                }
            );

        });


    $$(
        "[data-delete-account]",
        container
    )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    deleteAccount(
                        button.dataset
                            .accountType,

                        button.dataset
                            .deleteAccount
                    );

                }
            );

        });
}


function addAccount(type) {

    const name =
        prompt(
            type === "cash"
                ? "Cash account name"
                : "Bank account name"
        );


    if (!name) return;


    const clean =
        name.trim();


    if (!clean) return;


    const accounts =
        type === "cash"
            ? data.settings.cashAccounts
            : data.settings.bankAccounts;


    accounts.push({

        id: uid(type),

        name: clean,

        balance: 0,

        primary:
            accounts.length === 0,

        countInStats: true

    });


    saveData();

    renderEverything();

    showToast(
        "Account added"
    );
}


function editAccount(
    type,
    id
) {

    const accounts =
        type === "cash"
            ? data.settings.cashAccounts
            : data.settings.bankAccounts;


    const account =
        accounts.find(
            a => a.id === id
        );


    if (!account) return;


    const name =
        prompt(
            "Account name",
            account.name
        );


    if (!name) return;


    account.name =
        name.trim();


    saveData();

    renderEverything();

    showToast(
        "Account updated"
    );
}


function setPrimaryAccount(
    type,
    id
) {

    const accounts =
        type === "cash"
            ? data.settings.cashAccounts
            : data.settings.bankAccounts;


    accounts.forEach(
        account => {

            account.primary =
                account.id === id;

        }
    );


    saveData();

    renderEverything();

    showToast(
        "Primary account changed"
    );
}


function deleteAccount(
    type,
    id
) {

    const accounts =
        type === "cash"
            ? data.settings.cashAccounts
            : data.settings.bankAccounts;


    const account =
        accounts.find(
            a => a.id === id
        );


    if (!account) return;


    if (account.primary) {

        showToast(
            "Choose another primary account first"
        );

        return;
    }


    const used =
        data.transactions.some(
            tx =>
                tx.account === id ||
                tx.fromAccount === id ||
                tx.toAccount === id
        );


    if (used) {

        showToast(
            "This account is used by transactions"
        );

        return;
    }


    const index =
        accounts.indexOf(account);


    accounts.splice(
        index,
        1
    );


    saveData();

    renderEverything();

    showToast(
        "Account deleted"
    );
}


/* =========================================================
   28. INVESTMENTS
   ========================================================= */

function renderInvestmentSettings() {

    const container =
        $(
            "#investmentList, " +
            "[data-investment-list]"
        );


    if (!container) return;


    const investments =
        data.settings.investments;


    container.innerHTML =
        investments.length
            ? investments
                .map(
                    item =>
                        `
                        <div class="investment-row">

                            <div class="investment-row-main">

                                <div class="investment-row-title">
                                    ${escapeHTML(
                                        item.name
                                    )}
                                </div>

                                <div class="investment-row-subtitle">
                                    Return %
                                </div>

                            </div>

                            <input
                                type="number"
                                step="0.01"
                                value="${Number(
                                    item.returnPercentage
                                ) || 0}"
                                data-investment-return="${item.id}"
                            >

                            <button
                                type="button"
                                class="row-icon-button danger"
                                data-delete-investment="${item.id}"
                            >
                                ${icon(
                                    "trash-2",
                                    16
                                )}
                            </button>

                        </div>
                        `
                )
                .join("")
            : emptyManagedHTML(
                "No investments"
            );


    $$(
        "[data-investment-return]",
        container
    )
        .forEach(input => {

            input.addEventListener(
                "change",
                () => {

                    const item =
                        investments.find(
                            investment =>
                                investment.id ===
                                input.dataset
                                    .investmentReturn
                        );


                    if (!item) return;


                    item.returnPercentage =
                        numberValue(
                            input.value
                        );


                    saveData();

                    renderInvestmentSummary();

                }
            );

        });


    $$(
        "[data-delete-investment]",
        container
    )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    data.settings.investments =
                        data.settings.investments
                            .filter(
                                item =>
                                    item.id !==
                                    button.dataset
                                        .deleteInvestment
                            );


                    saveData();

                    renderEverything();

                    showToast(
                        "Investment deleted"
                    );

                }
            );

        });


    refreshIcons();
}


function addInvestment() {

    const name =
        prompt(
            "Investment name"
        );


    if (!name) return;


    const amount =
        numberValue(
            prompt(
                "Current amount"
            )
        );


    if (amount < 0) return;


    const returnPercentage =
        numberValue(
            prompt(
                "Expected / actual return percentage"
            )
        );


    data.settings.investments.push({

        id: uid("investment"),

        name: name.trim(),

        amount,

        returnPercentage

    });


    saveData();

    renderEverything();

    showToast(
        "Investment added"
    );
}


function openInvestments() {

    const sheet =
        getSheet(
            "investmentsSheet"
        );


    if (!sheet) {

        showPage(
            "dashboard"
        );

        return;
    }


    renderInvestmentSettings();

    openSheet(sheet);
}


/* =========================================================
   29. SAVINGS
   ========================================================= */

function renderSavingsSettings() {

    const container =
        $(
            "#savingsList, " +
            "[data-savings-list]"
        );


    if (!container) return;


    const savings =
        data.settings.savings;


    container.innerHTML =
        savings.length
            ? savings
                .map(
                    item =>
                        `
                        <div class="savings-row">

                            <div class="savings-row-main">

                                <div class="savings-row-title">
                                    ${escapeHTML(
                                        item.name
                                    )}
                                </div>

                                <div class="savings-row-subtitle">
                                    ${money(
                                        item.current
                                    )} saved
                                </div>

                            </div>

                            <input
                                type="number"
                                value="${Number(
                                    item.goal
                                ) || 0}"
                                data-savings-goal="${item.id}"
                            >

                            <button
                                type="button"
                                class="row-icon-button danger"
                                data-delete-savings="${item.id}"
                            >
                                ${icon(
                                    "trash-2",
                                    16
                                )}
                            </button>

                        </div>
                        `
                )
                .join("")
            : emptyManagedHTML(
                "No savings goals"
            );


    $$(
        "[data-savings-goal]",
        container
    )
        .forEach(input => {

            input.addEventListener(
                "change",
                () => {

                    const item =
                        savings.find(
                            saving =>
                                saving.id ===
                                input.dataset
                                    .savingsGoal
                        );


                    if (!item) return;


                    item.goal =
                        numberValue(
                            input.value
                        );


                    saveData();

                    renderSavingsSummary();

                }
            );

        });


    $$(
        "[data-delete-savings]",
        container
    )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    data.settings.savings =
                        data.settings.savings
                            .filter(
                                item =>
                                    item.id !==
                                    button.dataset
                                        .deleteSavings
                            );


                    saveData();

                    renderEverything();

                    showToast(
                        "Savings goal deleted"
                    );

                }
            );

        });


    refreshIcons();
}


function addSavings() {

    const name =
        prompt(
            "What are you saving for?"
        );


    if (!name) return;


    const goal =
        numberValue(
            prompt(
                "Goal amount"
            )
        );


    if (goal <= 0) {

        showToast(
            "Enter a valid goal"
        );

        return;
    }


    const current =
        numberValue(
            prompt(
                "Current saved amount",
                "0"
            )
        );


    data.settings.savings.push({

        id: uid("saving"),

        name: name.trim(),

        current,

        goal

    });


    saveData();

    renderEverything();

    showToast(
        "Savings goal added"
    );
}


function openSavings() {

    const sheet =
        getSheet(
            "savingsSheet"
        );


    if (!sheet) {

        showPage(
            "dashboard"
        );

        return;
    }


    renderSavingsSettings();

    openSheet(sheet);
}


/* =========================================================
   30. STATISTIC TOGGLES
   ========================================================= */

function renderStatisticToggles() {

    const settings =
        data.settings
            .statisticAccounts;


    $$(
        "[data-stat-toggle]"
    )
        .forEach(toggle => {

            const key =
                toggle.dataset
                    .statToggle;


            if (
                Object.prototype
                    .hasOwnProperty
                    .call(settings, key)
            ) {

                toggle.checked =
                    settings[key];

            }

        });
}


/* =========================================================
   31. SETTINGS EVENTS
   ========================================================= */

function setupSettings() {

    document.addEventListener(
        "change",
        event => {

            const toggle =
                event.target.closest(
                    "[data-stat-toggle]"
                );


            if (!toggle) return;


            const key =
                toggle.dataset.statToggle;


            data.settings
                .statisticAccounts[key] =
                    toggle.checked;


            saveData();

            renderStatistics();

        }
    );


    document.addEventListener(
        "click",
        event => {

            const addCategoryButton =
                event.target.closest(
                    "[data-add-category]"
                );


            if (addCategoryButton) {

                addCategory(
                    addCategoryButton
                        .dataset
                        .addCategory
                );

                return;
            }


            const addAccountButton =
                event.target.closest(
                    "[data-add-account]"
                );


            if (addAccountButton) {

                addAccount(
                    addAccountButton
                        .dataset
                        .addAccount
                );

                return;
            }


            const addInvestmentButton =
                event.target.closest(
                    "[data-add-investment]"
                );


            if (addInvestmentButton) {

                addInvestment();

                return;
            }


            const addSavingsButton =
                event.target.closest(
                    "[data-add-savings]"
                );


            if (addSavingsButton) {

                addSavings();

                return;
            }


            const investmentButton =
                event.target.closest(
                    "[data-edit-investments]"
                );


            if (investmentButton) {

                openInvestments();

                return;
            }


            const savingsButton =
                event.target.closest(
                    "[data-edit-savings]"
                );


            if (savingsButton) {

                openSavings();

                return;
            }

        }
    );
}


/* =========================================================
   32. IMPORT / EXPORT
   ========================================================= */

function setupImportExport() {

    const exportButton =
        $(
            "[data-export-json]"
        );


    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportJSON
        );

    }


    const importButton =
        $(
            "[data-import-json]"
        );


    if (importButton) {

        importButton.addEventListener(
            "click",
            () => {

                const input =
                    $(
                        "#jsonImportInput"
                    );


                if (input) {

                    input.click();

                }

            }
        );

    }


    const fileInput =
        $(
            "#jsonImportInput"
        );


    if (fileInput) {

        fileInput.addEventListener(
            "change",
            importJSON
        );

    }


    const pdfButton =
        $(
            "[data-export-pdf]"
        );


    if (pdfButton) {

        pdfButton.addEventListener(
            "click",
            exportPDF
        );

    }
}


function exportJSON() {

    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );


    downloadBlob(
        blob,
        `trackit-backup-${todayISO()}.json`
    );


    showToast(
        "Backup exported"
    );
}


function importJSON(event) {

    const file =
        event.target.files?.[0];


    if (!file) return;


    const reader =
        new FileReader();


    reader.onload =
        function () {

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
                        "Invalid TrackIt file"
                    );

                }


                data =
                    mergeDefaults(
                        imported
                    );


                saveData();

                renderEverything();

                showToast(
                    "Data imported"
                );

            }

            catch (error) {

                console.error(
                    error
                );

                showToast(
                    "Invalid backup file"
                );

            }

        };


    reader.readAsText(file);

    event.target.value = "";
}


function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href = url;

    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {
            URL.revokeObjectURL(url);
        },
        1000
    );
}


/* =========================================================
   33. PDF EXPORT
   ========================================================= */

function exportPDF() {

    if (
        typeof window.jspdf ===
        "undefined"
    ) {

        showToast(
            "PDF library not loaded"
        );

        return;
    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF();


    const expenses =
        data.transactions
            .filter(
                tx =>
                    tx.type === "expense"
            );


    const income =
        data.transactions
            .filter(
                tx =>
                    tx.type === "income"
            );


    const expenseTotal =
        expenses.reduce(
            (sum, tx) =>
                sum + tx.amount,
            0
        );


    const incomeTotal =
        income.reduce(
            (sum, tx) =>
                sum + tx.amount,
            0
        );


    doc.setFontSize(24);

    doc.text(
        "TrackIt",
        20,
        22
    );


    doc.setFontSize(10);

    doc.setTextColor(
        100,
        100,
        100
    );


    doc.text(
        `Statement • ${formatDate(
            todayISO()
        )}`,
        20,
        30
    );


    doc.setTextColor(
        20,
        20,
        20
    );


    doc.setFontSize(13);

    doc.text(
        "Summary",
        20,
        46
    );


    doc.setFontSize(11);

    doc.text(
        `Total income: ${money(
            incomeTotal
        )}`,
        20,
        56
    );


    doc.text(
        `Total expenses: ${money(
            expenseTotal
        )}`,
        20,
        64
    );


    doc.text(
        `Net: ${money(
            incomeTotal -
            expenseTotal
        )}`,
        20,
        72
    );


    let y = 88;


    doc.setFontSize(13);

    doc.text(
        "Transactions",
        20,
        y
    );


    y += 10;


    doc.setFontSize(9);


    const sorted =
        [...data.transactions]
            .sort(
                (a, b) =>
                    b.date.localeCompare(
                        a.date
                    )
            );


    sorted.forEach(tx => {

        if (y > 275) {

            doc.addPage();

            y = 20;

        }


        const sign =
            tx.type === "expense"
                ? "-"
                : tx.type === "income"
                    ? "+"
                    : "";


        const title =
            tx.type === "transfer"
                ? "Self Transfer"
                : tx.category;


        doc.text(
            formatShortDate(
                tx.date
            ),
            20,
            y
        );


        doc.text(
            title,
            50,
            y
        );


        doc.text(
            `${sign}${money(
                tx.amount
            )}`,
            155,
            y
        );


        y += 7;

    });


    doc.save(
        `trackit-statement-${todayISO()}.pdf`
    );


    showToast(
        "PDF exported"
    );
}


/* =========================================================
   34. GLOBAL BUTTONS
   ========================================================= */

function setupGlobalButtons() {

    document.addEventListener(
        "click",
        event => {

            const transfer =
                event.target.closest(
                    "[data-open-transfer]"
                );


            if (transfer) {

                openTransferSheet();

                return;
            }


            const edit =
                event.target.closest(
                    "[data-save-edit]"
                );


            if (edit) {

                saveEditedTransaction();

                return;
            }


            const close =
                event.target.closest(
                    "[data-close-sheet]"
                );


            if (close) {

                const sheet =
                    close.closest(
                        ".bottom-sheet"
                    );


                if (sheet) {

                    closeSheet(
                        sheet
                    );

                }

                return;
            }


            const closeDialog =
                event.target.closest(
                    "[data-close-dialog]"
                );


            if (closeDialog) {

                const dialog =
                    closeDialog.closest(
                        ".dialog"
                    );


                if (dialog) {

                    closeDialogElement(
                        dialog
                    );

                }

                return;
            }

        }
    );
}


/* =========================================================
   35. SHEETS
   ========================================================= */

function getSheet(id) {

    return (
        document.getElementById(id) ||
        $(`.${id}`)
    );
}


function openSheet(sheet) {

    if (!sheet) return;


    sheet.classList.add(
        "active"
    );


    const overlay =
        $(
            ".overlay"
        );


    if (overlay) {

        overlay.classList.add(
            "active"
        );

    }


    document.body.style.overflow =
        "hidden";
}


function closeSheet(sheet) {

    if (!sheet) return;


    sheet.classList.remove(
        "active"
    );


    const activeSheets =
        $$(".bottom-sheet.active");


    if (!activeSheets.length) {

        const overlay =
            $(".overlay");


        if (overlay) {

            overlay.classList.remove(
                "active"
            );

        }


        document.body.style.overflow =
            "";
    }
}


function setupOverlay() {

    const overlay =
        $(".overlay");


    if (!overlay) return;


    overlay.addEventListener(
        "click",
        () => {

            $$(".bottom-sheet.active")
                .forEach(
                    closeSheet
                );


            $$(".dialog.active")
                .forEach(
                    closeDialogElement
                );

        }
    );
}


/* =========================================================
   36. DIALOGS
   ========================================================= */

function openDialog(id) {

    const dialog =
        document.getElementById(id);


    if (!dialog) return;


    dialog.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";
}


function closeDialogElement(
    dialog
) {

    if (!dialog) return;


    dialog.classList.remove(
        "active"
    );


    if (
        !$(".bottom-sheet.active") &&
        !$(".dialog.active")
    ) {

        document.body.style.overflow =
            "";

    }
}


/* =========================================================
   37. CATEGORY PICKER
   ========================================================= */

function openCategoryPicker(
    type,
    amount,
    sourceInput
) {

    const sheet =
        document.createElement(
            "div"
        );


    sheet.className =
        "bottom-sheet active";


    sheet.innerHTML = `

        <div class="sheet-handle"></div>

        <div class="sheet-header">

            <div>
                <h2>
                    ${
                        type === "expense"
                            ? "Expense category"
                            : "Income category"
                    }
                </h2>

                <p>
                    ${money(amount)}
                </p>
            </div>

            <button
                class="sheet-close"
                type="button"
            >
                ×
            </button>

        </div>

        <div class="category-grid">

            ${
                (
                    type === "expense"
                        ? data.settings.expenseCategories
                        : data.settings.incomeCategories
                )
                    .map(
                        (category, index) =>
                            `
                            <button
                                class="category-button"
                                data-index="${index}"
                            >

                                <span class="category-button-icon">
                                    ${icon(
                                        getCategoryIcon(
                                            category
                                        ),
                                        16
                                    )}
                                </span>

                                <span class="category-button-name">
                                    ${escapeHTML(
                                        category
                                    )}
                                </span>

                            </button>
                            `
                    )
                    .join("")
            }

        </div>

    `;


    document.body.appendChild(
        sheet
    );


    const overlay =
        $(".overlay");


    overlay?.classList.add(
        "active"
    );


    sheet.querySelector(
        ".sheet-close"
    )
        ?.addEventListener(
            "click",
            () => {

                sheet.remove();

                overlay?.classList.remove(
                    "active"
                );

            }
        );


    $$(".category-button", sheet)
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const categories =
                        type === "expense"
                            ? data.settings.expenseCategories
                            : data.settings.incomeCategories;


                    addTransaction({

                        type,

                        amount,

                        category:
                            categories[
                                Number(
                                    button.dataset
                                        .index
                                )
                            ],

                        account:
                            getPrimaryAccountId(
                                "cash"
                            )

                    });


                    sheet.remove();

                    overlay?.classList.remove(
                        "active"
                    );

                }
            );

        });


    refreshIcons();
}


function getPrimaryAccountId(
    type
) {

    const accounts =
        type === "bank"
            ? data.settings.bankAccounts
            : data.settings.cashAccounts;


    return (
        accounts.find(
            account =>
                account.primary
        )?.id ||
        accounts[0]?.id ||
        null
    );
}


/* =========================================================
   38. COMPLETE RENDER
   ========================================================= */

function renderEverything() {

    renderDashboard();

    renderAllTransactions();

    renderStatistics();

    renderSettings();

    renderInvestmentSummary();

    renderSavingsSummary();

    refreshIcons();
}


/* =========================================================
   39. EMPTY MANAGED
   ========================================================= */

function emptyManagedHTML(
    text
) {

    return `
        <div class="empty-state">
            <p>${escapeHTML(text)}</p>
        </div>
    `;
}


/* =========================================================
   40. TOAST
   ========================================================= */

let toastTimer = null;


function showToast(
    message
) {

    let toast =
        $(".toast");


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.className =
            "toast";

        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.classList.add(
        "active"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "active"
                );

            },
            2200
        );
}


/* =========================================================
   41. KEYBOARD / ENTER SUPPORT
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Escape"
        ) {
            return;
        }


        $$(".bottom-sheet.active")
            .forEach(
                closeSheet
            );


        $$(".dialog.active")
            .forEach(
                closeDialogElement
            );

    }
);


/* =========================================================
   42. PREVENT INVALID QUICK AMOUNTS
   ========================================================= */

document.addEventListener(
    "input",
    event => {

        const input =
            event.target.closest(
                ".amount-input, " +
                ".quick-expense-input, " +
                ".quick-income-input"
            );


        if (!input) return;


        input.value =
            input.value.replace(
                /[^0-9.]/
                ,
                ""
            );


        const parts =
            input.value.split(".");


        if (parts.length > 2) {

            input.value =
                parts[0] +
                "." +
                parts.slice(1).join("");

        }

    }
);


/* =========================================================
   43. PUBLIC DEBUG HELPER
   ========================================================= */

window.TrackIt = {

    getData() {
        return data;
    },

    save() {
        saveData();
    },

    reset() {

        const confirmed =
            confirm(
                "Reset all TrackIt data?"
            );


        if (!confirmed) return;


        data =
            structuredClone(
                defaultData
            );


        saveData();

        renderEverything();

        showToast(
            "TrackIt reset"
        );

    }

};


console.log(
    "TrackIt initialized."
);