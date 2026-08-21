/* =========================================================
   TRACKIT
   Expense + Income Tracker
   Vanilla JavaScript
   ========================================================= */


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "trackit_data_v1";


const DEFAULT_DATA = {
    categories: {
        expenses: [],
        incomes: []
    },

    accounts: [],

    investments: [],

    savings: [],

    transactions: [],

    settings: {
        statistics: {
            cash: true,
            bank: true,
            investments: true,
            savings: true
        }
    }
};


let data = loadData();

let currentPage = "dashboard";

let pendingQuickTransaction = null;

let selectedPickerCallback = null;

let editingTransactionId = null;

let editingAccountId = null;

let editingInvestmentId = null;

let editingSavingId = null;

let swipeState = null;


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeApp();

});


function initializeApp() {

    ensureDataStructure();

    setupNavigation();

    setupDashboardInputs();

    setupGlobalButtons();

    setupModalEvents();

    setupKeyboardBehavior();

    setupSwipeTransactions();

    renderEverything();

    checkInitialSetup();

}


/* =========================================================
   DATA
   ========================================================= */

function loadData() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return structuredClone(DEFAULT_DATA);
        }

        const parsed = JSON.parse(saved);

        return mergeDefaults(parsed);

    } catch (error) {

        console.error("TrackIt storage error:", error);

        return structuredClone(DEFAULT_DATA);

    }

}


function saveData() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

}


function mergeDefaults(saved) {

    const result = structuredClone(DEFAULT_DATA);

    if (!saved || typeof saved !== "object") {
        return result;
    }

    result.categories = {
        ...result.categories,
        ...(saved.categories || {})
    };

    result.settings = {
        ...result.settings,
        ...(saved.settings || {}),
        statistics: {
            ...result.settings.statistics,
            ...(saved.settings?.statistics || {})
        }
    };

    result.accounts = Array.isArray(saved.accounts)
        ? saved.accounts
        : [];

    result.investments = Array.isArray(saved.investments)
        ? saved.investments
        : [];

    result.savings = Array.isArray(saved.savings)
        ? saved.savings
        : [];

    result.transactions = Array.isArray(saved.transactions)
        ? saved.transactions
        : [];

    return result;

}


function ensureDataStructure() {

    data = mergeDefaults(data);

    saveData();

}


/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function $all(selector) {
    return [...document.querySelectorAll(selector)];
}


function generateId(prefix = "id") {

    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );

}


function todayString() {

    const date = new Date();

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function monthString(date = new Date()) {

    return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0")
    );

}


function formatCurrency(amount) {

    const number = Number(amount) || 0;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(number);

}


function formatNumber(amount) {

    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);

}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

}


function formatTime(timestamp) {

    if (!timestamp) {
        return "";
    }

    return new Date(timestamp).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit"
    });

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function getAccount(id) {

    return data.accounts.find(account => account.id === id);

}


function getPrimaryAccount(type) {

    return data.accounts.find(
        account =>
            account.type === type &&
            account.primary === true
    );

}


function getAccountBalance(id) {

    let balance = 0;

    data.transactions.forEach(transaction => {

        if (transaction.type === "expense") {

            if (transaction.accountId === id) {
                balance -= Number(transaction.amount);
            }

        }

        if (transaction.type === "income") {

            if (transaction.accountId === id) {
                balance += Number(transaction.amount);
            }

        }

        if (transaction.type === "transfer") {

            if (transaction.fromAccountId === id) {
                balance -= Number(transaction.amount);
            }

            if (transaction.toAccountId === id) {
                balance += Number(transaction.amount);
            }

        }

    });

    return balance;

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    $all(".nav-item").forEach(button => {

        button.addEventListener("click", () => {

            const page = button.dataset.page;

            if (!page) {
                return;
            }

            switchPage(page);

        });

    });

}


function switchPage(page) {

    currentPage = page;

    $all(".page").forEach(section => {

        section.classList.toggle(
            "active",
            section.dataset.page === page
        );

    });


    $all(".nav-item").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });


    if (page === "dashboard") {
        renderDashboard();
    }

    if (page === "transactions") {
        renderTransactionsPage();
    }

    if (page === "statistics") {
        renderStatistics();
    }

    if (page === "settings") {
        renderSettings();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   DASHBOARD INPUTS
   ========================================================= */

function setupDashboardInputs() {

    const expenseInputs = $all(
        ".expense-amount-input"
    );

    const incomeInputs = $all(
        ".income-amount-input"
    );


    expenseInputs.forEach(input => {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === "Tab"
                ) {

                    event.preventDefault();

                    openQuickCategoryPicker(
                        "expense",
                        input
                    );

                }

            }
        );

    });


    incomeInputs.forEach(input => {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === "Tab"
                ) {

                    event.preventDefault();

                    openQuickCategoryPicker(
                        "income",
                        input
                    );

                }

            }
        );

    });


    $all(".expense-amount-input").forEach(input => {

        input.addEventListener("input", () => {

            input.value = input.value
                .replace(/[^\d.]/g, "")
                .replace(/(\..*)\./g, "$1");

        });

    });


    $all(".income-amount-input").forEach(input => {

        input.addEventListener("input", () => {

            input.value = input.value
                .replace(/[^\d.]/g, "")
                .replace(/(\..*)\./g, "$1");

        });

    });

}


/* =========================================================
   QUICK CATEGORY PICKER
   ========================================================= */

function openQuickCategoryPicker(type, input) {

    const amount = Number(input.value);

    if (!amount || amount <= 0) {

        showToast("Enter an amount first.");

        input.focus();

        return;

    }


    const accountType =
        input.dataset.accountType || "cash";


    const account =
        getPrimaryAccount(accountType);


    if (!account) {

        showToast(
            `Add a primary ${accountType} account first.`
        );

        openAccountManager(accountType);

        return;

    }


    const categories =
        type === "expense"
            ? data.categories.expenses
            : data.categories.incomes;


    if (categories.length === 0) {

        showToast(
            `Add an ${type} category first.`
        );

        openCategoryManager(type);

        return;

    }


    pendingQuickTransaction = {
        type,
        amount,
        accountId: account.id,
        input
    };


    openCategoryPicker(
        type,
        categories
    );

}


/* =========================================================
   CATEGORY PICKER
   ========================================================= */

function openCategoryPicker(type, categories) {

    const modal =
        $("#category-picker-modal");

    if (!modal) {
        return;
    }


    const title =
        modal.querySelector(".modal-title");

    if (title) {

        title.textContent =
            type === "expense"
                ? "Choose expense category"
                : "Choose income category";

    }


    const list =
        modal.querySelector(".category-options");

    if (!list) {
        return;
    }


    list.innerHTML = "";


    categories.forEach(category => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "category-option";

        button.dataset.categoryId =
            category.id;

        button.innerHTML = `
            <span>${escapeHTML(category.name)}</span>
            <span>›</span>
        `;


        button.addEventListener(
            "click",
            () => {

                completeQuickTransaction(
                    category
                );

            }
        );


        list.appendChild(button);

    });


    openModal(modal);

}


function completeQuickTransaction(category) {

    if (!pendingQuickTransaction) {
        return;
    }


    const transaction = {

        id: generateId("tx"),

        type: pendingQuickTransaction.type,

        amount: pendingQuickTransaction.amount,

        accountId:
            pendingQuickTransaction.accountId,

        categoryId: category.id,

        categoryName: category.name,

        date: todayString(),

        createdAt: Date.now()

    };


    data.transactions.push(transaction);

    saveData();


    if (pendingQuickTransaction.input) {

        pendingQuickTransaction.input.value = "";

    }


    closeAllModals();

    pendingQuickTransaction = null;

    renderEverything();

    showToast(
        transaction.type === "expense"
            ? "Expense added."
            : "Income added."
    );

}


/* =========================================================
   GLOBAL BUTTONS
   ========================================================= */

function setupGlobalButtons() {

    const settingsButton =
        $("#settings-button");

    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            () => switchPage("settings")
        );

    }


    $all("[data-action]").forEach(button => {

        button.addEventListener("click", () => {

            const action = button.dataset.action;

            handleAction(action);

        });

    });

}


function handleAction(action) {

    switch (action) {

        case "add-expense-category":
            openCategoryManager("expense");
            break;

        case "add-income-category":
            openCategoryManager("income");
            break;

        case "accounts":
            openAccountManager();
            break;

        case "investments":
            openInvestmentManager();
            break;

        case "savings":
            openSavingManager();
            break;

        case "edit-investments":
            openInvestmentManager();
            break;

        case "edit-savings":
            openSavingManager();
            break;

        case "export-json":
            exportJSON();
            break;

        case "import-json":
            importJSON();
            break;

        case "export-pdf":
            exportStatementPDF();
            break;

        case "add-account":
            openAccountForm();
            break;

        case "add-investment":
            openInvestmentForm();
            break;

        case "add-saving":
            openSavingForm();
            break;

        case "add-category":
            openCategoryManager("expense");
            break;

        default:
            console.log("Unknown action:", action);

    }

}


/* =========================================================
   MODALS
   ========================================================= */

function setupModalEvents() {

    $all(".modal-overlay").forEach(overlay => {

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay
                ) {

                    closeModal(overlay);

                }

            }
        );

    });


    $all("[data-close-modal]").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const modal =
                    button.closest(".modal-overlay");

                closeModal(modal);

            }
        );

    });

}


function openModal(modal) {

    if (!modal) {
        return;
    }

    modal.hidden = false;

    document.body.style.overflow = "hidden";

}


function closeModal(modal) {

    if (!modal) {
        return;
    }

    modal.hidden = true;

    if (
        $all(".modal-overlay:not([hidden])").length === 0
    ) {

        document.body.style.overflow = "";

    }

}


function closeAllModals() {

    $all(".modal-overlay").forEach(modal => {

        modal.hidden = true;

    });

    document.body.style.overflow = "";

}


/* =========================================================
   CATEGORY MANAGEMENT
   ========================================================= */

function openCategoryManager(type) {

    let modal =
        $("#category-manager-modal");


    if (!modal) {

        createCategoryManagerModal();

        modal =
            $("#category-manager-modal");

    }


    modal.dataset.categoryType = type;


    renderCategoryManager(type);

    openModal(modal);

}


function createCategoryManagerModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "category-manager-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Categories
                    </h2>

                    <p>
                        Add or remove categories
                    </p>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-created-modal
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path
                            d="M18 6 6 18M6 6l12 12"
                        />
                    </svg>
                </button>

            </div>

            <div
                class="modal-body"
                id="category-manager-body"
            ></div>

        </div>

    `;


    document.body.appendChild(overlay);


    overlay.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                closeModal(overlay);
            }

        }
    );


    overlay
        .querySelector("[data-close-created-modal]")
        .addEventListener(
            "click",
            () => closeModal(overlay)
        );

}


function renderCategoryManager(type) {

    const modal =
        $("#category-manager-modal");

    const body =
        $("#category-manager-body");

    if (!modal || !body) {
        return;
    }


    const key =
        type === "expense"
            ? "expenses"
            : "incomes";


    const title =
        modal.querySelector(".modal-title");


    title.textContent =
        type === "expense"
            ? "Expense Categories"
            : "Income Categories";


    body.innerHTML = `

        <div class="modal-form">

            <div class="form-field">

                <label>
                    New category
                </label>

                <input
                    id="new-category-input"
                    type="text"
                    maxlength="40"
                    placeholder="Category name"
                    autocomplete="off"
                >

            </div>

            <button
                type="button"
                class="primary-action full-width-action"
                id="save-category-button"
            >
                Add category
            </button>

            <div class="settings-card">

                <div
                    class="settings-list"
                    id="category-list"
                ></div>

            </div>

        </div>

    `;


    const list =
        body.querySelector("#category-list");


    data.categories[key].forEach(category => {

        const row =
            document.createElement("div");

        row.className =
            "settings-row";


        row.innerHTML = `

            <div class="settings-row-info">

                <strong>
                    ${escapeHTML(category.name)}
                </strong>

            </div>

            <button
                type="button"
                class="secondary-action delete-category-button"
                data-id="${category.id}"
            >
                Delete
            </button>

        `;


        row
            .querySelector(".delete-category-button")
            .addEventListener(
                "click",
                () => deleteCategory(type, category.id)
            );


        list.appendChild(row);

    });


    body
        .querySelector("#save-category-button")
        .addEventListener(
            "click",
            () => {

                const input =
                    body.querySelector(
                        "#new-category-input"
                    );

                const name =
                    input.value.trim();


                if (!name) {

                    showToast(
                        "Enter a category name."
                    );

                    input.focus();

                    return;

                }


                const exists =
                    data.categories[key].some(
                        category =>
                            category.name.toLowerCase() ===
                            name.toLowerCase()
                    );


                if (exists) {

                    showToast(
                        "Category already exists."
                    );

                    return;

                }


                data.categories[key].push({

                    id: generateId("cat"),

                    name

                });


                saveData();

                renderCategoryManager(type);

                renderEverything();

                showToast("Category added.");

            }
        );

}


function deleteCategory(type, categoryId) {

    const key =
        type === "expense"
            ? "expenses"
            : "incomes";


    data.categories[key] =
        data.categories[key].filter(
            category =>
                category.id !== categoryId
        );


    saveData();

    renderCategoryManager(type);

    renderEverything();

    showToast("Category deleted.");

}


/* =========================================================
   ACCOUNT MANAGEMENT
   ========================================================= */

function openAccountManager(type = null) {

    let modal =
        $("#account-manager-modal");


    if (!modal) {

        createAccountManagerModal();

        modal =
            $("#account-manager-modal");

    }


    modal.dataset.accountType =
        type || "";


    renderAccountManager();

    openModal(modal);

}


function createAccountManagerModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "account-manager-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Accounts
                    </h2>

                    <p>
                        Manage your cash and bank accounts
                    </p>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-account-modal
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>

            </div>

            <div
                class="modal-body"
                id="account-manager-body"
            ></div>

        </div>

    `;


    document.body.appendChild(overlay);


    overlay.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                closeModal(overlay);
            }

        }
    );


    overlay
        .querySelector("[data-close-account-modal]")
        .addEventListener(
            "click",
            () => closeModal(overlay)
        );

}


function renderAccountManager() {

    const modal =
        $("#account-manager-modal");

    const body =
        $("#account-manager-body");


    body.innerHTML = `

        <div class="modal-form">

            <button
                type="button"
                class="primary-action full-width-action"
                id="new-account-button"
            >
                Add account
            </button>

            <div class="settings-card">

                <div
                    class="account-list"
                    id="account-list"
                ></div>

            </div>

        </div>

    `;


    const list =
        body.querySelector("#account-list");


    if (data.accounts.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>No accounts yet</strong>
                <span>
                    Add one cash and one bank account.
                </span>
            </div>
        `;

    }


    data.accounts.forEach(account => {

        const row =
            document.createElement("div");

        row.className =
            "account-item";


        const balance =
            getAccountBalance(account.id);


        row.innerHTML = `

            <div class="transaction-icon">

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                >
                    ${
                        account.type === "cash"
                        ? `
                            <rect
                                x="3"
                                y="5"
                                width="18"
                                height="14"
                                rx="2"
                            />
                            <circle
                                cx="12"
                                cy="12"
                                r="2.5"
                            />
                        `
                        : `
                            <rect
                                x="3"
                                y="5"
                                width="18"
                                height="14"
                                rx="2"
                            />
                            <path
                                d="M3 9h18"
                            />
                        `
                    }
                </svg>

            </div>

            <div class="account-item-info">

                <span class="account-item-name">
                    ${escapeHTML(account.name)}
                </span>

                <span class="account-item-balance">
                    ${account.type === "cash" ? "Cash" : "Bank"}
                    · ${formatCurrency(balance)}
                </span>

            </div>

            ${
                account.primary
                    ? `
                        <span class="primary-badge">
                            Primary
                        </span>
                    `
                    : ""
            }

            <button
                type="button"
                class="secondary-action edit-account-button"
                data-id="${account.id}"
            >
                Edit
            </button>

        `;


        row
            .querySelector(".edit-account-button")
            .addEventListener(
                "click",
                () => openAccountForm(account.id)
            );


        list.appendChild(row);

    });


    body
        .querySelector("#new-account-button")
        .addEventListener(
            "click",
            () => openAccountForm()
        );

}


/* =========================================================
   ACCOUNT FORM
   ========================================================= */

function openAccountForm(id = null) {

    editingAccountId = id;


    let modal =
        $("#account-form-modal");


    if (!modal) {

        createAccountFormModal();

        modal =
            $("#account-form-modal");

    }


    const account =
        id
            ? getAccount(id)
            : null;


    modal.querySelector(".modal-title").textContent =
        account
            ? "Edit account"
            : "Add account";


    const body =
        modal.querySelector(".modal-body");


    body.innerHTML = `

        <div class="modal-form">

            <div class="form-field">

                <label>
                    Account name
                </label>

                <input
                    id="account-name-input"
                    type="text"
                    maxlength="40"
                    placeholder="e.g. Main Cash"
                    value="${escapeHTML(account?.name || "")}"
                >

            </div>


            <div class="form-field">

                <label>
                    Account type
                </label>

                <select id="account-type-input">

                    <option
                        value="cash"
                        ${account?.type === "cash" ? "selected" : ""}
                    >
                        Cash
                    </option>

                    <option
                        value="bank"
                        ${account?.type === "bank" ? "selected" : ""}
                    >
                        Bank
                    </option>

                </select>

            </div>


            <label
                class="settings-toggle-row"
                style="padding:0; border:0;"
            >

                <span class="settings-row-info">

                    <strong>
                        Primary account
                    </strong>

                    <span>
                        Used for quick dashboard entries
                    </span>

                </span>

                <span class="switch">

                    <input
                        type="checkbox"
                        id="account-primary-input"
                        ${account?.primary ? "checked" : ""}
                    >

                    <span class="switch-track"></span>

                </span>

            </label>

        </div>

    `;


    openModal(modal);

}


function createAccountFormModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "account-form-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Add account
                    </h2>

                    <p>
                        Cash or bank account
                    </p>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-account-form
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>

            </div>

            <div class="modal-body"></div>

            <div class="modal-actions">

                <button
                    type="button"
                    class="primary-action"
                    id="save-account-button"
                >
                    Save
                </button>

                <button
                    type="button"
                    class="secondary-action"
                    data-close-account-form
                >
                    Cancel
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(overlay);


    $all(
        "[data-close-account-form]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => closeModal(overlay)
        );

    });


    overlay
        .querySelector("#save-account-button")
        .addEventListener(
            "click",
            saveAccount
        );

}


function saveAccount() {

    const modal =
        $("#account-form-modal");


    const name =
        modal
            .querySelector("#account-name-input")
            .value
            .trim();


    const type =
        modal
            .querySelector("#account-type-input")
            .value;


    const primary =
        modal
            .querySelector("#account-primary-input")
            .checked;


    if (!name) {

        showToast(
            "Enter an account name."
        );

        return;

    }


    if (editingAccountId) {

        const account =
            getAccount(editingAccountId);


        account.name = name;

        account.type = type;

        if (primary) {
            setPrimaryAccount(account.id);
        }

        account.primary = primary;

    } else {

        const account = {

            id: generateId("account"),

            name,

            type,

            primary: false

        };


        data.accounts.push(account);


        if (primary) {
            setPrimaryAccount(account.id);
        }

    }


    saveData();

    closeAllModals();

    renderEverything();

    showToast("Account saved.");

    editingAccountId = null;

}


function setPrimaryAccount(id) {

    const selected =
        getAccount(id);


    if (!selected) {
        return;
    }


    data.accounts.forEach(account => {

        if (account.type === selected.type) {

            account.primary =
                account.id === id;

        }

    });

}


/* =========================================================
   INVESTMENTS
   ========================================================= */

function openInvestmentManager() {

    let modal =
        $("#investment-manager-modal");


    if (!modal) {

        createInvestmentManagerModal();

        modal =
            $("#investment-manager-modal");

    }


    renderInvestmentManager();

    openModal(modal);

}


function createInvestmentManagerModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "investment-manager-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Investments
                    </h2>

                    <p>
                        Edit investment values and returns
                    </p>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-investments
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>

            </div>

            <div
                class="modal-body"
                id="investment-manager-body"
            ></div>

        </div>

    `;


    document.body.appendChild(overlay);


    overlay
        .querySelector("[data-close-investments]")
        .addEventListener(
            "click",
            () => closeModal(overlay)
        );


    overlay.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                closeModal(overlay);
            }

        }
    );

}


function renderInvestmentManager() {

    const body =
        $("#investment-manager-body");


    body.innerHTML = `

        <div class="modal-form">

            <button
                type="button"
                class="primary-action full-width-action"
                id="new-investment-button"
            >
                Add investment
            </button>

            <div class="settings-card">

                <div
                    class="settings-list"
                    id="investment-list"
                ></div>

            </div>

        </div>

    `;


    const list =
        body.querySelector("#investment-list");


    if (data.investments.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>No investments</strong>
                <span>
                    Add an investment to track it.
                </span>
            </div>
        `;

    }


    data.investments.forEach(investment => {

        const row =
            document.createElement("div");

        row.className =
            "settings-row";


        row.innerHTML = `

            <div class="settings-row-info">

                <strong>
                    ${escapeHTML(investment.name)}
                </strong>

                <span>
                    ${formatCurrency(investment.amount)}
                    · ${investment.returnPercent}% return
                </span>

            </div>

            <button
                type="button"
                class="secondary-action"
                data-edit-investment="${investment.id}"
            >
                Edit
            </button>

        `;


        row
            .querySelector(
                "[data-edit-investment]"
            )
            .addEventListener(
                "click",
                () => openInvestmentForm(investment.id)
            );


        list.appendChild(row);

    });


    body
        .querySelector("#new-investment-button")
        .addEventListener(
            "click",
            () => openInvestmentForm()
        );

}


function openInvestmentForm(id = null) {

    editingInvestmentId = id;


    let modal =
        $("#investment-form-modal");


    if (!modal) {

        createInvestmentFormModal();

        modal =
            $("#investment-form-modal");

    }


    const investment =
        id
            ? data.investments.find(
                item => item.id === id
            )
            : null;


    modal.querySelector(".modal-title").textContent =
        investment
            ? "Edit investment"
            : "Add investment";


    modal.querySelector(".modal-body").innerHTML = `

        <div class="modal-form">

            <div class="form-field">

                <label>
                    Investment name
                </label>

                <input
                    id="investment-name"
                    type="text"
                    maxlength="50"
                    placeholder="e.g. Mutual Fund"
                    value="${escapeHTML(investment?.name || "")}"
                >

            </div>

            <div class="form-field">

                <label>
                    Current amount
                </label>

                <div class="input-with-unit">

                    <span style="padding-left:13px;">
                        ₹
                    </span>

                    <input
                        id="investment-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${investment?.amount ?? ""}"
                    >

                </div>

            </div>

            <div class="form-field">

                <label>
                    Return percentage
                </label>

                <div class="input-with-unit">

                    <input
                        id="investment-return"
                        type="number"
                        step="0.01"
                        value="${investment?.returnPercent ?? 0}"
                    >

                    <span>%</span>

                </div>

            </div>

        </div>

    `;


    openModal(modal);

}


function createInvestmentFormModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "investment-form-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Add investment
                    </h2>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-investment-form
                >
                    ×
                </button>

            </div>

            <div class="modal-body"></div>

            <div class="modal-actions">

                <button
                    type="button"
                    class="primary-action"
                    id="save-investment"
                >
                    Save
                </button>

                <button
                    type="button"
                    class="secondary-action"
                    data-close-investment-form
                >
                    Cancel
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(overlay);


    $all(
        "[data-close-investment-form]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => closeModal(overlay)
        );

    });


    overlay
        .querySelector("#save-investment")
        .addEventListener(
            "click",
            saveInvestment
        );

}


function saveInvestment() {

    const modal =
        $("#investment-form-modal");


    const name =
        modal
            .querySelector("#investment-name")
            .value
            .trim();


    const amount =
        Number(
            modal
                .querySelector("#investment-amount")
                .value
        );


    const returnPercent =
        Number(
            modal
                .querySelector("#investment-return")
                .value
        );


    if (!name) {

        showToast(
            "Enter an investment name."
        );

        return;

    }


    if (editingInvestmentId) {

        const item =
            data.investments.find(
                investment =>
                    investment.id ===
                    editingInvestmentId
            );


        item.name = name;

        item.amount = amount || 0;

        item.returnPercent =
            returnPercent || 0;

    } else {

        data.investments.push({

            id: generateId("investment"),

            name,

            amount: amount || 0,

            returnPercent:
                returnPercent || 0

        });

    }


    saveData();

    closeAllModals();

    renderEverything();

    showToast("Investment saved.");

    editingInvestmentId = null;

}


/* =========================================================
   SAVINGS
   ========================================================= */

function openSavingManager() {

    let modal =
        $("#saving-manager-modal");


    if (!modal) {

        createSavingManagerModal();

        modal =
            $("#saving-manager-modal");

    }


    renderSavingManager();

    openModal(modal);

}


function createSavingManagerModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "saving-manager-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Savings
                    </h2>

                    <p>
                        Edit savings goals
                    </p>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-savings
                >
                    ×
                </button>

            </div>

            <div
                class="modal-body"
                id="saving-manager-body"
            ></div>

        </div>

    `;


    document.body.appendChild(overlay);


    overlay
        .querySelector("[data-close-savings]")
        .addEventListener(
            "click",
            () => closeModal(overlay)
        );


    overlay.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                closeModal(overlay);
            }

        }
    );

}


function renderSavingManager() {

    const body =
        $("#saving-manager-body");


    body.innerHTML = `

        <div class="modal-form">

            <button
                type="button"
                class="primary-action full-width-action"
                id="new-saving-button"
            >
                Add saving goal
            </button>

            <div class="settings-card">

                <div
                    class="settings-list"
                    id="saving-list"
                ></div>

            </div>

        </div>

    `;


    const list =
        body.querySelector("#saving-list");


    if (data.savings.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>No savings goals</strong>
                <span>
                    Add something you want to save for.
                </span>
            </div>
        `;

    }


    data.savings.forEach(saving => {

        const row =
            document.createElement("div");

        row.className =
            "settings-row";


        row.innerHTML = `

            <div class="settings-row-info">

                <strong>
                    ${escapeHTML(saving.name)}
                </strong>

                <span>
                    Goal ${formatCurrency(saving.goalAmount)}
                </span>

            </div>

            <button
                type="button"
                class="secondary-action"
                data-edit-saving="${saving.id}"
            >
                Edit
            </button>

        `;


        row
            .querySelector(
                "[data-edit-saving]"
            )
            .addEventListener(
                "click",
                () => openSavingForm(saving.id)
            );


        list.appendChild(row);

    });


    body
        .querySelector("#new-saving-button")
        .addEventListener(
            "click",
            () => openSavingForm()
        );

}


function openSavingForm(id = null) {

    editingSavingId = id;


    let modal =
        $("#saving-form-modal");


    if (!modal) {

        createSavingFormModal();

        modal =
            $("#saving-form-modal");

    }


    const saving =
        id
            ? data.savings.find(
                item => item.id === id
            )
            : null;


    modal.querySelector(".modal-title").textContent =
        saving
            ? "Edit saving"
            : "Add saving";


    modal.querySelector(".modal-body").innerHTML = `

        <div class="modal-form">

            <div class="form-field">

                <label>
                    Saving goal
                </label>

                <input
                    id="saving-name"
                    type="text"
                    maxlength="50"
                    placeholder="e.g. New MacBook"
                    value="${escapeHTML(saving?.name || "")}"
                >

            </div>

            <div class="form-field">

                <label>
                    Goal amount
                </label>

                <div class="input-with-unit">

                    <span style="padding-left:13px;">
                        ₹
                    </span>

                    <input
                        id="saving-goal"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${saving?.goalAmount ?? ""}"
                    >

                </div>

            </div>

            <div class="form-field">

                <label>
                    Current saved amount
                </label>

                <div class="input-with-unit">

                    <span style="padding-left:13px;">
                        ₹
                    </span>

                    <input
                        id="saving-current"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${saving?.currentAmount ?? 0}"
                    >

                </div>

            </div>

        </div>

    `;


    openModal(modal);

}


function createSavingFormModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "saving-form-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Add saving
                    </h2>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-saving-form
                >
                    ×
                </button>

            </div>

            <div class="modal-body"></div>

            <div class="modal-actions">

                <button
                    type="button"
                    class="primary-action"
                    id="save-saving"
                >
                    Save
                </button>

                <button
                    type="button"
                    class="secondary-action"
                    data-close-saving-form
                >
                    Cancel
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(overlay);


    $all(
        "[data-close-saving-form]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => closeModal(overlay)
        );

    });


    overlay
        .querySelector("#save-saving")
        .addEventListener(
            "click",
            saveSaving
        );

}


function saveSaving() {

    const modal =
        $("#saving-form-modal");


    const name =
        modal
            .querySelector("#saving-name")
            .value
            .trim();


    const goal =
        Number(
            modal
                .querySelector("#saving-goal")
                .value
        );


    const current =
        Number(
            modal
                .querySelector("#saving-current")
                .value
        );


    if (!name) {

        showToast(
            "Enter a saving goal."
        );

        return;

    }


    if (editingSavingId) {

        const item =
            data.savings.find(
                saving =>
                    saving.id ===
                    editingSavingId
            );


        item.name = name;

        item.goalAmount =
            goal || 0;

        item.currentAmount =
            current || 0;

    } else {

        data.savings.push({

            id: generateId("saving"),

            name,

            goalAmount:
                goal || 0,

            currentAmount:
                current || 0

        });

    }


    saveData();

    closeAllModals();

    renderEverything();

    showToast("Saving goal saved.");

    editingSavingId = null;

}


/* =========================================================
   TRANSACTION EDIT
   ========================================================= */

function openTransactionEditor(id) {

    const transaction =
        data.transactions.find(
            item => item.id === id
        );


    if (!transaction) {
        return;
    }


    editingTransactionId = id;


    let modal =
        $("#transaction-edit-modal");


    if (!modal) {

        createTransactionEditModal();

        modal =
            $("#transaction-edit-modal");

    }


    const categories =
        transaction.type === "expense"
            ? data.categories.expenses
            : data.categories.incomes;


    const categoryOptions =
        categories
            .map(
                category => `
                    <option
                        value="${category.id}"
                        ${category.id === transaction.categoryId ? "selected" : ""}
                    >
                        ${escapeHTML(category.name)}
                    </option>
                `
            )
            .join("");


    modal.querySelector(".modal-title").textContent =
        "Edit transaction";


    modal.querySelector(".modal-body").innerHTML = `

        <div class="modal-form">

            <div class="form-field">

                <label>
                    Amount
                </label>

                <div class="input-with-unit">

                    <span style="padding-left:13px;">
                        ₹
                    </span>

                    <input
                        id="edit-tx-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${transaction.amount}"
                    >

                </div>

            </div>

            ${
                transaction.type === "transfer"
                ? `
                    <div class="form-field">
                        <label>Transfer</label>
                        <input
                            type="text"
                            disabled
                            value="Self transfer"
                        >
                    </div>
                `
                : `
                    <div class="form-field">

                        <label>
                            Category
                        </label>

                        <select id="edit-tx-category">
                            ${categoryOptions}
                        </select>

                    </div>
                `
            }


            <div class="form-field">

                <label>
                    Date
                </label>

                <input
                    id="edit-tx-date"
                    type="date"
                    value="${transaction.date}"
                >

            </div>

        </div>

    `;


    openModal(modal);

}


function createTransactionEditModal() {

    const overlay =
        document.createElement("div");

    overlay.id =
        "transaction-edit-modal";

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>
                    <h2 class="modal-title">
                        Edit transaction
                    </h2>

                    <p>
                        Modify transaction details
                    </p>
                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-close-tx-edit
                >
                    ×
                </button>

            </div>

            <div class="modal-body"></div>

            <div class="modal-actions">

                <button
                    type="button"
                    class="primary-action"
                    id="save-tx-edit"
                >
                    Save
                </button>

                <button
                    type="button"
                    class="secondary-action"
                    id="delete-tx-edit"
                >
                    Delete
                </button>

                <button
                    type="button"
                    class="secondary-action"
                    data-close-tx-edit
                >
                    Cancel
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(overlay);


    $all(
        "[data-close-tx-edit]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => closeModal(overlay)
        );

    });


    overlay
        .querySelector("#save-tx-edit")
        .addEventListener(
            "click",
            saveTransactionEdit
        );


    overlay
        .querySelector("#delete-tx-edit")
        .addEventListener(
            "click",
            () => {

                if (editingTransactionId) {

                    deleteTransaction(
                        editingTransactionId
                    );

                    closeAllModals();

                }

            }
        );

}


function saveTransactionEdit() {

    const transaction =
        data.transactions.find(
            item =>
                item.id ===
                editingTransactionId
        );


    if (!transaction) {
        return;
    }


    const modal =
        $("#transaction-edit-modal");


    const amount =
        Number(
            modal
                .querySelector("#edit-tx-amount")
                .value
        );


    const date =
        modal
            .querySelector("#edit-tx-date")
            .value;


    if (!amount || amount <= 0) {

        showToast(
            "Enter a valid amount."
        );

        return;

    }


    transaction.amount = amount;

    transaction.date =
        date || transaction.date;


    if (transaction.type !== "transfer") {

        const categoryId =
            modal
                .querySelector(
                    "#edit-tx-category"
                )
                .value;


        const categories =
            transaction.type === "expense"
                ? data.categories.expenses
                : data.categories.incomes;


        const category =
            categories.find(
                item =>
                    item.id === categoryId
            );


        if (category) {

            transaction.categoryId =
                category.id;

            transaction.categoryName =
                category.name;

        }

    }


    saveData();

    closeAllModals();

    renderEverything();

    showToast("Transaction updated.");

    editingTransactionId = null;

}


/* =========================================================
   DELETE TRANSACTION
   ========================================================= */

function deleteTransaction(id) {

    data.transactions =
        data.transactions.filter(
            transaction =>
                transaction.id !== id
        );


    saveData();

    renderEverything();

    showToast("Transaction deleted.");

}


/* =========================================================
   SWIPE DELETE
   ========================================================= */

function setupSwipeTransactions() {

    document.addEventListener(
        "pointerdown",
        startSwipe
    );

    document.addEventListener(
        "pointermove",
        moveSwipe
    );

    document.addEventListener(
        "pointerup",
        endSwipe
    );

}


function startSwipe(event) {

    const row =
        event.target.closest(
            ".transaction-row"
        );


    if (!row) {
        return;
    }


    swipeState = {

        row,

        pointerId:
            event.pointerId,

        startX:
            event.clientX,

        startY:
            event.clientY,

        currentX:
            event.clientX,

        moved: false,

        horizontal: false

    };

}


function moveSwipe(event) {

    if (!swipeState) {
        return;
    }


    if (
        event.pointerId !==
        swipeState.pointerId
    ) {
        return;
    }


    const dx =
        event.clientX -
        swipeState.startX;


    const dy =
        event.clientY -
        swipeState.startY;


    if (
        Math.abs(dx) < 8 &&
        Math.abs(dy) < 8
    ) {
        return;
    }


    if (!swipeState.horizontal) {

        if (Math.abs(dy) > Math.abs(dx)) {

            swipeState = null;

            return;

        }

        swipeState.horizontal = true;

    }


    if (!swipeState.horizontal) {
        return;
    }


    event.preventDefault();


    swipeState.moved = true;

    swipeState.currentX =
        event.clientX;


    let translate =
        dx;


    if (translate > 0) {
        translate *= 0.25;
    }


    if (translate < -130) {

        translate =
            -130 +
            (translate + 130) * 0.15;

    }


    swipeState.row.classList.add(
        "swiping"
    );


    swipeState.row.style.transform =
        `translateX(${translate}px)`;

}


function endSwipe(event) {

    if (!swipeState) {
        return;
    }


    const state =
        swipeState;


    swipeState = null;


    const dx =
        event.clientX -
        state.startX;


    state.row.classList.remove(
        "swiping"
    );


    if (
        state.moved &&
        dx < -90
    ) {

        const id =
            state.row.dataset.transactionId;


        state.row.classList.add(
            "deleting"
        );


        setTimeout(
            () => {

                deleteTransaction(id);

            },
            180
        );


        return;

    }


    state.row.style.transform = "";


    if (!state.moved) {

        const id =
            state.row.dataset.transactionId;


        openTransactionEditor(id);

    }

}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

    renderDashboard();

    renderTransactionsPage();

    renderStatistics();

    renderSettings();

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

    const today =
        todayString();


    const currentMonth =
        monthString();


    const todayTransactions =
        data.transactions.filter(
            transaction =>
                transaction.date === today
        );


    const monthTransactions =
        data.transactions.filter(
            transaction =>
                transaction.date.startsWith(
                    currentMonth
                )
        );


    const todayExpense =
        sumTransactions(
            todayTransactions,
            "expense"
        );


    const todayIncome =
        sumTransactions(
            todayTransactions,
            "income"
        );


    const monthExpense =
        sumTransactions(
            monthTransactions,
            "expense"
        );


    const monthIncome =
        sumTransactions(
            monthTransactions,
            "income"
        );


    setText(
        "#today-expenses",
        formatCurrency(todayExpense)
    );

    setText(
        "#today-income",
        formatCurrency(todayIncome)
    );

    setText(
        "#month-expenses",
        formatCurrency(monthExpense)
    );

    setText(
        "#month-income",
        formatCurrency(monthIncome)
    );


    setText(
        "#today-net",
        formatCurrency(
            todayIncome -
            todayExpense
        )
    );


    renderTodayTransactions();

    renderAccountQuickLabels();

    renderShiftOverview();

    renderInvestmentDashboard();

    renderSavingDashboard();

}


function sumTransactions(
    transactions,
    type
) {

    return transactions
        .filter(
            transaction =>
                transaction.type === type
        )
        .reduce(
            (sum, transaction) =>
                sum +
                Number(transaction.amount),
            0
        );

}


function setText(selector, value) {

    const element =
        $(selector);

    if (element) {
        element.textContent = value;
    }

}


/* =========================================================
   DASHBOARD TRANSACTIONS
   ========================================================= */

function renderTodayTransactions() {

    const list =
        $("#today-transaction-list");


    if (!list) {
        return;
    }


    const transactions =
        data.transactions
            .filter(
                transaction =>
                    transaction.date ===
                    todayString()
            )
            .sort(
                (a, b) =>
                    b.createdAt -
                    a.createdAt
            );


    list.innerHTML = "";


    if (transactions.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>
                    No transactions today
                </strong>

                <span>
                    Add an expense or income above.
                </span>
            </div>
        `;

        return;

    }


    transactions.forEach(
        transaction => {

            list.appendChild(
                createTransactionElement(
                    transaction
                )
            );

        }
    );

}


/* =========================================================
   TRANSACTION ELEMENT
   ========================================================= */

function createTransactionElement(
    transaction
) {

    const row =
        document.createElement("div");


    row.className =
        "transaction-row";


    row.dataset.transactionId =
        transaction.id;


    const account =
        transaction.accountId
            ? getAccount(
                transaction.accountId
            )
            : null;


    let title =
        transaction.categoryName ||
        "Transaction";


    let meta =
        account
            ? account.name
            : "";


    if (transaction.type === "transfer") {

        const from =
            getAccount(
                transaction.fromAccountId
            );

        const to =
            getAccount(
                transaction.toAccountId
            );


        title =
            "Self transfer";


        meta =
            `${from?.name || "Account"} → ${to?.name || "Account"}`;

    }


    let iconPath = `
        <circle
            cx="12"
            cy="12"
            r="8"
        />
    `;


    if (transaction.type === "expense") {

        iconPath = `
            <path d="M12 6v12"/>
            <path d="m7 13 5 5 5-5"/>
        `;

    }


    if (transaction.type === "income") {

        iconPath = `
            <path d="M12 18V6"/>
            <path d="m7 11 5-5 5 5"/>
        `;

    }


    if (transaction.type === "transfer") {

        iconPath = `
            <path d="M7 7h10"/>
            <path d="m13 3 4 4-4 4"/>
            <path d="M17 17H7"/>
            <path d="m11 21-4-4 4-4"/>
        `;

    }


    let amountPrefix = "";

    if (transaction.type === "expense") {
        amountPrefix = "-";
    }

    if (transaction.type === "income") {
        amountPrefix = "+";
    }


    row.innerHTML = `

        <div class="transaction-icon">

            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                ${iconPath}
            </svg>

        </div>


        <div class="transaction-info">

            <div class="transaction-title">
                ${escapeHTML(title)}
            </div>

            <div class="transaction-meta">
                ${escapeHTML(meta)}
                ${transaction.createdAt ? ` · ${formatTime(transaction.createdAt)}` : ""}
            </div>

        </div>


        <div
            class="transaction-amount ${transaction.type}"
        >
            ${amountPrefix}${formatCurrency(transaction.amount)}
        </div>

    `;


    return row;

}


/* =========================================================
   TRANSACTIONS PAGE
   ========================================================= */

function renderTransactionsPage() {

    const list =
        $("#all-transaction-list");


    if (!list) {
        return;
    }


    const transactions =
        [...data.transactions]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date) ||
                    b.createdAt -
                    a.createdAt
            );


    list.innerHTML = "";


    if (transactions.length === 0) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>
                    No transactions
                </strong>

                <span>
                    Your transactions will appear here.
                </span>
            </div>
        `;

        return;

    }


    const grouped = {};


    transactions.forEach(
        transaction => {

            if (!grouped[transaction.date]) {
                grouped[transaction.date] = [];
            }

            grouped[transaction.date].push(
                transaction
            );

        }
    );


    Object.keys(grouped)
        .sort(
            (a, b) =>
                new Date(b) -
                new Date(a)
        )
        .forEach(date => {

            const heading =
                document.createElement("div");


            heading.className =
                "section-heading";


            heading.style.marginTop =
                "22px";


            heading.innerHTML = `
                <h2>
                    ${formatDate(date)}
                </h2>
            `;


            list.appendChild(heading);


            grouped[date].forEach(
                transaction => {

                    list.appendChild(
                        createTransactionElement(
                            transaction
                        )
                    );

                }
            );

        });

}


/* =========================================================
   SHIFT OVERVIEW
   ========================================================= */

function renderShiftOverview() {

    const today =
        data.transactions.filter(
            transaction =>
                transaction.date ===
                todayString()
        );


    const expenses =
        sumTransactions(
            today,
            "expense"
        );


    const income =
        sumTransactions(
            today,
            "income"
        );


    const transfers =
        today.filter(
            transaction =>
                transaction.type ===
                "transfer"
        ).length;


    setText(
        "#shift-expense",
        formatCurrency(expenses)
    );


    setText(
        "#shift-income",
        formatCurrency(income)
    );


    setText(
        "#shift-transfers",
        String(transfers)
    );

}


/* =========================================================
   INVESTMENT DASHBOARD
   ========================================================= */

function renderInvestmentDashboard() {

    const amount =
        data.investments.reduce(
            (sum, investment) =>
                sum +
                Number(investment.amount || 0),
            0
        );


    const returnAmount =
        data.investments.reduce(
            (sum, investment) =>
                sum +
                (
                    Number(investment.amount || 0) *
                    Number(investment.returnPercent || 0) /
                    100
                ),
            0
        );


    setText(
        "#dashboard-investments",
        formatCurrency(amount)
    );


    setText(
        "#dashboard-investment-return",
        `Estimated return ${formatCurrency(returnAmount)}`
    );

}


/* =========================================================
   SAVING DASHBOARD
   ========================================================= */

function renderSavingDashboard() {

    const current =
        data.savings.reduce(
            (sum, saving) =>
                sum +
                Number(saving.currentAmount || 0),
            0
        );


    const goal =
        data.savings.reduce(
            (sum, saving) =>
                sum +
                Number(saving.goalAmount || 0),
            0
        );


    setText(
        "#dashboard-savings",
        formatCurrency(current)
    );


    setText(
        "#dashboard-saving-goal",
        `Goal ${formatCurrency(goal)}`
    );


    const progress =
        goal > 0
            ? Math.min(
                100,
                (current / goal) * 100
            )
            : 0;


    const bar =
        $("#savings-progress");


    if (bar) {

        bar.style.width =
            progress + "%";

    }

}


/* =========================================================
   ACCOUNT QUICK LABELS
   ========================================================= */

function renderAccountQuickLabels() {

    $all(
        "[data-account-label]"
    ).forEach(element => {

        const type =
            element.dataset.accountLabel;


        const account =
            getPrimaryAccount(type);


        element.textContent =
            account
                ? account.name
                : `Add primary ${type}`;

    });

}


/* =========================================================
   STATISTICS
   ========================================================= */

function renderStatistics() {

    const transactions =
        getStatisticsTransactions();


    const expenses =
        sumTransactions(
            transactions,
            "expense"
        );


    const incomes =
        sumTransactions(
            transactions,
            "income"
        );


    const net =
        incomes -
        expenses;


    const daysWithData =
        new Set(
            transactions.map(
                transaction =>
                    transaction.date
            )
        ).size;


    const averageDailyIncome =
        daysWithData > 0
            ? incomes / daysWithData
            : 0;


    const averageDailyExpense =
        daysWithData > 0
            ? expenses / daysWithData
            : 0;


    setText(
        "#stat-total-expense",
        formatCurrency(expenses)
    );


    setText(
        "#stat-total-income",
        formatCurrency(incomes)
    );


    setText(
        "#stat-net",
        formatCurrency(net)
    );


    setText(
        "#stat-average-income",
        formatCurrency(
            averageDailyIncome
        )
    );


    setText(
        "#stat-average-expense",
        formatCurrency(
            averageDailyExpense
        )
    );


    setText(
        "#stat-transaction-count",
        String(transactions.length)
    );


    renderStatisticsBreakdown();

}


function getStatisticsTransactions() {

    return data.transactions.filter(
        transaction => {

            if (
                transaction.type ===
                "expense" ||
                transaction.type ===
                "income"
            ) {

                const account =
                    getAccount(
                        transaction.accountId
                    );


                if (!account) {
                    return true;
                }


                if (
                    account.type ===
                    "cash"
                ) {

                    return data.settings
                        .statistics
                        .cash;

                }


                if (
                    account.type ===
                    "bank"
                ) {

                    return data.settings
                        .statistics
                        .bank;

                }

            }


            if (
                transaction.type ===
                "transfer"
            ) {

                return false;

            }


            return true;

        }
    );

}


function renderStatisticsBreakdown() {

    const container =
        $("#statistics-breakdown");


    if (!container) {
        return;
    }


    const transactions =
        getStatisticsTransactions();


    const expensesByCategory = {};


    transactions
        .filter(
            transaction =>
                transaction.type ===
                "expense"
        )
        .forEach(
            transaction => {

                const name =
                    transaction.categoryName ||
                    "Other";


                expensesByCategory[name] =
                    (
                        expensesByCategory[name] ||
                        0
                    ) +
                    Number(
                        transaction.amount
                    );

            }
        );


    const entries =
        Object.entries(
            expensesByCategory
        ).sort(
            (a, b) =>
                b[1] - a[1]
        );


    container.innerHTML = "";


    entries.forEach(
        ([category, amount]) => {

            const row =
                document.createElement("div");


            row.className =
                "breakdown-row";


            row.innerHTML = `

                <span>
                    ${escapeHTML(category)}
                </span>

                <strong>
                    ${formatCurrency(amount)}
                </strong>

            `;


            container.appendChild(row);

        }
    );


    if (entries.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <strong>
                    No expense data
                </strong>

                <span>
                    Statistics will appear after transactions.
                </span>
            </div>
        `;

    }

}


/* =========================================================
   SETTINGS
   ========================================================= */

function renderSettings() {

    renderStatisticsToggles();

    renderSettingsAccountSummary();

}


function renderStatisticsToggles() {

    const mappings = {

        cash:
            "#statistics-cash-toggle",

        bank:
            "#statistics-bank-toggle",

        investments:
            "#statistics-investments-toggle",

        savings:
            "#statistics-savings-toggle"

    };


    Object.entries(mappings)
        .forEach(
            ([key, selector]) => {

                const input =
                    $(selector);


                if (!input) {
                    return;
                }


                input.checked =
                    Boolean(
                        data.settings
                            .statistics[key]
                    );


                input.onchange =
                    () => {

                        data.settings
                            .statistics[key] =
                            input.checked;


                        saveData();

                        renderStatistics();

                    };

            }
        );

}


function renderSettingsAccountSummary() {

    const container =
        $("#settings-account-summary");


    if (!container) {
        return;
    }


    const cash =
        getPrimaryAccount("cash");


    const bank =
        getPrimaryAccount("bank");


    container.innerHTML = `

        <div class="breakdown-row">

            <span>
                Primary cash
            </span>

            <strong>
                ${
                    cash
                        ? escapeHTML(cash.name)
                        : "Not set"
                }
            </strong>

        </div>


        <div class="breakdown-row">

            <span>
                Primary bank
            </span>

            <strong>
                ${
                    bank
                        ? escapeHTML(bank.name)
                        : "Not set"
                }
            </strong>

        </div>

    `;

}


/* =========================================================
   SETUP CHECK
   ========================================================= */

function checkInitialSetup() {

    const cash =
        getPrimaryAccount("cash");


    const bank =
        getPrimaryAccount("bank");


    const card =
        $("#setup-required-card");


    if (!card) {
        return;
    }


    if (!cash || !bank) {

        card.hidden = false;

    } else {

        card.hidden = true;

    }

}


/* =========================================================
   KEYBOARD BEHAVIOR
   ========================================================= */

function setupKeyboardBehavior() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeAllModals();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Enter" &&
                event.key !== "Tab"
            ) {
                return;
            }


            const input =
                event.target;


            if (
                !input.matches(
                    ".expense-amount-input, .income-amount-input"
                )
            ) {
                return;
            }


            event.preventDefault();

        }
    );

}


/* =========================================================
   IMPORT / EXPORT JSON
   ========================================================= */

function exportJSON() {

    const json =
        JSON.stringify(
            data,
            null,
            2
        );


    downloadFile(
        json,
        `trackit-backup-${todayString()}.json`,
        "application/json"
    );


    showToast(
        "Backup exported."
    );

}


function importJSON() {

    const input =
        document.createElement("input");


    input.type =
        "file";


    input.accept =
        "application/json,.json";


    input.addEventListener(
        "change",
        async () => {

            const file =
                input.files?.[0];


            if (!file) {
                return;
            }


            try {

                const text =
                    await file.text();


                const imported =
                    JSON.parse(text);


                if (
                    !imported ||
                    typeof imported !==
                    "object"
                ) {

                    throw new Error(
                        "Invalid file"
                    );

                }


                data =
                    mergeDefaults(
                        imported
                    );


                saveData();

                renderEverything();

                closeAllModals();

                showToast(
                    "Backup imported."
                );

            } catch (error) {

                console.error(error);

                showToast(
                    "Invalid TrackIt backup."
                );

            }

        }
    );


    input.click();

}


function downloadFile(
    content,
    filename,
    type
) {

    const blob =
        new Blob(
            [content],
            { type }
        );


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
   PDF EXPORT
   ========================================================= */

function exportStatementPDF() {

    /*
     * Uses the browser's print dialog.
     * User can select "Save as PDF".
     */

    const printWindow =
        window.open(
            "",
            "_blank"
        );


    if (!printWindow) {

        showToast(
            "Allow pop-ups to export PDF."
        );

        return;

    }


    const transactions =
        [...data.transactions]
            .sort(
                (a, b) =>
                    new Date(a.date) -
                    new Date(b.date)
            );


    const expense =
        sumTransactions(
            transactions,
            "expense"
        );


    const income =
        sumTransactions(
            transactions,
            "income"
        );


    const net =
        income - expense;


    const rows =
        transactions
            .map(
                transaction => {

                    const account =
                        transaction.accountId
                            ? getAccount(
                                transaction.accountId
                            )
                            : null;


                    return `

                        <tr>

                            <td>
                                ${escapeHTML(transaction.date)}
                            </td>

                            <td>
                                ${escapeHTML(
                                    transaction.categoryName ||
                                    (
                                        transaction.type ===
                                        "transfer"
                                            ? "Self transfer"
                                            : transaction.type
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    account?.name ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    transaction.type
                                )}
                            </td>

                            <td>
                                ₹${formatNumber(
                                    transaction.amount
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                TrackIt Statement
            </title>

            <style>

                body {
                    font-family:
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;

                    padding: 35px;
                    color: #1d1d1f;
                }

                h1 {
                    margin-bottom: 5px;
                }

                .date {
                    color: #777;
                    margin-bottom: 25px;
                }

                .summary {
                    display: flex;
                    gap: 30px;
                    margin-bottom: 30px;
                }

                .summary div {
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                    min-width: 130px;
                }

                .label {
                    display: block;
                    color: #777;
                    font-size: 12px;
                    margin-bottom: 7px;
                }

                strong {
                    font-size: 18px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    text-align: left;
                    padding: 10px 8px;
                    border-bottom: 1px solid #ddd;
                    font-size: 12px;
                }

                th {
                    background: #f4f3f6;
                }

            </style>

        </head>

        <body>

            <h1>
                TrackIt Statement
            </h1>

            <div class="date">
                Generated ${formatDate(todayString())}
            </div>

            <div class="summary">

                <div>

                    <span class="label">
                        Total Income
                    </span>

                    <strong>
                        ${formatCurrency(income)}
                    </strong>

                </div>

                <div>

                    <span class="label">
                        Total Expenses
                    </span>

                    <strong>
                        ${formatCurrency(expense)}
                    </strong>

                </div>

                <div>

                    <span class="label">
                        Net
                    </span>

                    <strong>
                        ${formatCurrency(net)}
                    </strong>

                </div>

            </div>


            <table>

                <thead>

                    <tr>

                        <th>
                            Date
                        </th>

                        <th>
                            Category
                        </th>

                        <th>
                            Account
                        </th>

                        <th>
                            Type
                        </th>

                        <th>
                            Amount
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${rows}

                </tbody>

            </table>

        </body>

        </html>

    `);


    printWindow.document.close();


    setTimeout(
        () => {

            printWindow.focus();

            printWindow.print();

        },
        400
    );

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;


function showToast(message) {

    let toast =
        $("#trackit-toast");


    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "trackit-toast";

        toast.className =
            "toast";

        document.body.appendChild(toast);

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );

}


/* =========================================================
   MODAL HELPERS
   ========================================================= */

function createBasicModal(
    id,
    title,
    subtitle = ""
) {

    const overlay =
        document.createElement("div");

    overlay.id = id;

    overlay.className =
        "modal-overlay";

    overlay.hidden = true;


    overlay.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <div>

                    <h2 class="modal-title">
                        ${escapeHTML(title)}
                    </h2>

                    ${
                        subtitle
                            ? `
                                <p>
                                    ${escapeHTML(subtitle)}
                                </p>
                            `
                            : ""
                    }

                </div>

                <button
                    type="button"
                    class="icon-button modal-close-button"
                    data-basic-close
                >
                    ×
                </button>

            </div>

            <div class="modal-body"></div>

        </div>

    `;


    document.body.appendChild(overlay);


    overlay
        .querySelector("[data-basic-close]")
        .addEventListener(
            "click",
            () => closeModal(overlay)
        );


    overlay.addEventListener(
        "click",
        event => {

            if (event.target === overlay) {
                closeModal(overlay);
            }

        }
    );


    return overlay;

}


/* =========================================================
   FALLBACK ELEMENT IDS
   ========================================================= */

function ensureDashboardElements() {

    /*
     * This function intentionally does not
     * replace your HTML.
     *
     * It simply allows the JavaScript to
     * work with either the current TrackIt
     * HTML structure or slightly older
     * versions of the same interface.
     */

}


/* =========================================================
   SAFETY: REQUIRED ACCOUNTS
   ========================================================= */

function canCreateTransaction(type, accountId) {

    const account =
        getAccount(accountId);


    if (!account) {

        showToast(
            "Account not found."
        );

        return false;

    }


    if (
        type === "expense" ||
        type === "income"
    ) {

        return true;

    }


    return false;

}


/* =========================================================
   TRANSFER CREATION
   ========================================================= */

function createTransfer(
    fromAccountId,
    toAccountId,
    amount
) {

    if (
        !fromAccountId ||
        !toAccountId
    ) {

        showToast(
            "Select both accounts."
        );

        return false;

    }


    if (
        fromAccountId ===
        toAccountId
    ) {

        showToast(
            "Choose two different accounts."
        );

        return false;

    }


    amount =
        Number(amount);


    if (
        !amount ||
        amount <= 0
    ) {

        showToast(
            "Enter a valid amount."
        );

        return false;

    }


    const from =
        getAccount(fromAccountId);


    const to =
        getAccount(toAccountId);


    if (!from || !to) {
        return false;
    }


    data.transactions.push({

        id:
            generateId("tx"),

        type:
            "transfer",

        amount,

        fromAccountId,

        toAccountId,

        date:
            todayString(),

        createdAt:
            Date.now()

    });


    saveData();

    renderEverything();

    showToast(
        "Transfer completed."
    );

    return true;

}


/* =========================================================
   EXPOSE OPTIONAL API
   ========================================================= */

window.TrackIt = {

    data,

    saveData,

    renderEverything,

    createTransfer,

    openAccountManager,

    openCategoryManager,

    openInvestmentManager,

    openSavingManager

};
