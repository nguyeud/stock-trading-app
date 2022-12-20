const finnhub = require("finnhub");
const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "cedmv5iad3i32ebrltggcedmv5iad3i32ebrlth0";
const finnhubClient = new finnhub.DefaultApi();

let favorites;
let valid;

// DOM Elements
const watchlistList = document.getElementById("watchlist-cards");
const stockList = document.getElementById("stock-info-list");
const stockLoader = document.getElementById("stock-info-list-loader");
const watchlistLoader = document.getElementById("watchlist-loader");
const elemCompany = document.getElementById("company-name");
const elemTicker = document.getElementById("company-ticker");
const elemIndustry = document.getElementById("company-industry");
const elemExchange = document.getElementById("company-exchange");
const elemCurrency = document.getElementById("price-currency");
const elemCurrentPrice = document.getElementById("price-current");
const elemPriceShift = document.getElementById("price-shift");
const elemPriceShiftPercentage = document.getElementById("price-shift-percentage");
const elemPriceHigh = document.getElementById("price-high");
const elemPriceLow = document.getElementById("price-low");
const elemPriceOpen = document.getElementById("price-open");
const elemPriceClose = document.getElementById("price-close");
const elemPETTMPeriod = document.getElementById("PETTMPeriod");
const elemPETTMV = document.getElementById("PETTMV");
const elemEPSPeriod = document.getElementById("EPSPeriod");
const elemEPSV = document.getElementById("EPSV");
const elemNPMTTM = document.getElementById("npmTTM");
const elemMarketCap = document.getElementById("market-cap");

// Constructors
function ItemInWatchlist(company, ticker, industry, exchange, currency, priceCurrent, priceChange, priceChangePercentage, priceHigh, priceLow, priceOpen, priceClose, peTTMPeriod, peTTMV, EPSPeriod, EPSV, NPMTTM, marketCap) {
    this.company = company;
    this.ticker = ticker;
    this.industry = industry;
    this.exchange = exchange;
    this.currency = currency;
    this.priceCurrent = priceCurrent;
    this.priceChange = priceChange;
    this.priceChangePercentage = priceChangePercentage;
    this.priceHigh = priceHigh;
    this.priceLow = priceLow;
    this.priceOpen = priceOpen;
    this.priceClose = priceClose;
    this.peTTMPeriod = peTTMPeriod;
    this.peTTMV = peTTMV;
    this.EPSPeriod = EPSPeriod;
    this.EPSV = EPSV;
    this.NPMTTM = NPMTTM;
    this.marketCap = marketCap;
}

// Buttons
const buttonSearch = document.getElementById("button-search");
const buttonFavorite = document.getElementById("button-favorite");
const buttonRefresh = document.getElementById("button-refresh");
let buttonFavorites;

// Toasts
const toastDelete = document.getElementById("toast-danger");
const toastWarning = document.getElementById("toast-warning");

// Event Listeners
buttonSearch.addEventListener("click", searchStock);
buttonFavorite.addEventListener("click", saveFavoriteToLocalStorage);
buttonRefresh.addEventListener("click", refreshStocks);

// Functions
function searchStock() {
    event.preventDefault();

    const input = document.getElementById("stock-search").value.toUpperCase();

    getCompanyProfile(input, "search");
    getQuote(input, "search");
    getBasicFinancials(input, "search");

    stockLoader.classList.add("hidden");
}

function getCompanyProfile(input, type) {
    finnhubClient.companyProfile2({ 'symbol': `${input}` }, (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadCompanyProfile(data, type);
        }
    });
}

function getQuote(input, type, id="") {
    finnhubClient.quote(`${input}`, (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadQuote(data, type, id);
        }
    });
}

function getBasicFinancials(input, type, id="") {
    finnhubClient.companyBasicFinancials(`${input}`, "all", (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadBasicFinancials(data, type, id);
        }
    });
}

function checkIfValid(input) {
    if (input === undefined || input === null) {
        valid = false;

        toastWarning.classList.remove("hidden");

        setTimeout(function () {
            toastWarning.classList.add("hidden");
        }, 3000);
    } else {
        valid = true;
    }

    return valid;
}

function loadCompanyProfile(profile, type) {
    if (checkIfValid(profile.name) === true) {
        // Load information from API
        const company = profile.name;
        const ticker = profile.ticker;
        const industry = profile.finnhubIndustry;
        const exchange = profile.exchange;
        const currency = profile.currency;

        if (type === "search") {
            elemCompany.innerText = company;
            elemTicker.innerText = ticker;
            elemIndustry.innerText = industry;
            elemExchange.innerText = exchange
            elemCurrency.innerText = currency;
        } 
    }
}

function loadQuote(quote, type, id="") {
    if (checkIfValid(quote.d) === true) {
        // Load information from API
        const currentPrice = quote.c;
        const priceChange = quote.d;
        const priceChangePercentage = quote.dp;
        const priceHigh = quote.h;
        const priceLow = quote.l;
        const priceOpen = quote.o;
        const priceClose = quote.pc;

        if (type === "search") {
            elemCurrentPrice.innerText = currentPrice;
            elemPriceShift.innerText = priceChange;
            elemPriceShiftPercentage.innerText = `(${priceChangePercentage}%)`;
            elemPriceHigh.innerText = `$${priceHigh}`;
            elemPriceLow.innerText = `$${priceLow}`;
            elemPriceOpen.innerText = `$${priceOpen}`;
            elemPriceClose.innerText = `$${priceClose}`;
        } else if (type === "refresh") {
            for (let i = 0; i < favorites.length; i++) {
                if (favorites[i]["ticker"] === id) {
                    favorites[i].priceCurrent = currentPrice;
                    favorites[i].priceChange = priceChange;
                    favorites[i].priceChangePercentage = `(${priceChangePercentage}%)`;
                    favorites[i].priceHigh = priceHigh;
                    favorites[i].priceLow = priceLow;
                    favorites[i].priceOpen = priceOpen;
                    favorites[i].priceClose = priceClose;

                    localStorage.setItem("stoutstonks-favorites", JSON.stringify(favorites));
                }
            }
        }
    }
}

function loadBasicFinancials(financials, type, id="") {
    if (checkIfValid(financials.series) === true) {
        // Load information from API
        const peTTMPeriod = financials.series.quarterly.peTTM[0].period;
        const peTTMV = financials.series.quarterly.peTTM[0].v;
        const epsPeriod = financials.series.quarterly.eps[0].period;
        const epsV = financials.series.quarterly.eps[0].v;
        const NPMTTM = financials.metric.netProfitMarginTTM;
        const marketCap = financials.metric.marketCapitalization;

        if (type === "search") {
            elemPETTMPeriod.innerText = peTTMPeriod;
            elemPETTMV.innerText = peTTMV;
            elemEPSPeriod.innerText = epsPeriod;
            elemEPSV.innerText = epsV;
            elemNPMTTM.innerText = NPMTTM;
            elemMarketCap.innerText = marketCap;
        } else if (type === "refresh") {
            for (let i = 0; i < favorites.length; i++) {
                if (favorites[i]["ticker"] === id) {
                    favorites[i].peTTMPeriod = peTTMPeriod;
                    favorites[i].peTTMV = peTTMV;
                    favorites[i].EPSPeriod = epsPeriod;
                    favorites[i].EPSV = epsV;
                    favorites[i].NPMTTM = NPMTTM;
                    favorites[i].marketCap = marketCap;

                    localStorage.setItem("stoutstonks-favorites", JSON.stringify(favorites));
                }
            }
        }
    }
}

function checkFavorites() {
    for (const item of favorites) {
        if (item.ticker === elemTicker.innerText) {
            return true;
        }
    }

    return false;
}

function saveFavoriteToLocalStorage() {
    if (checkFavorites() === false) {
        // Get DOM element information
        const company = elemCompany.innerText;
        const ticker = elemTicker.innerText;
        const industry = elemIndustry.innerText;
        const exchange = elemExchange.innerText;
        const currency = elemCurrency.innerText;

        const priceCurrent = elemCurrentPrice.innerText;
        const priceChange = elemPriceShift.innerText;
        const priceChangePercentage = elemPriceShiftPercentage.innerText;
        const priceHigh = elemPriceHigh.innerText;
        const priceLow = elemPriceLow.innerText;
        const priceOpen = elemPriceOpen.innerText;
        const priceClose = elemPriceClose.innerText;

        const peTTMPeriod = elemPETTMPeriod.innerText;
        const peTTMV = elemPETTMV.innerText;
        const EPSPeriod = elemEPSPeriod.innerText;
        const EPSV = elemEPSV.innerText;
        const NPMTTM = elemNPMTTM.innerText;
        const marketCap = elemMarketCap.innerText;

        const item = new ItemInWatchlist(company, ticker, industry, exchange, currency, priceCurrent, priceChange, priceChangePercentage, priceHigh, priceLow, priceOpen, priceClose, peTTMPeriod, peTTMV, EPSPeriod, EPSV, NPMTTM, marketCap);

        favorites.push(item);
        window.localStorage.setItem("stoutstonks-favorites", JSON.stringify(favorites));

        createHTMLElement(item);

        updateFavoriteButtons();
        addListenerToFavoriteButtons();
    }
}

function createHTMLElement(item) {
    const listHTML =
        `<div
        class="card p-6 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-900 dark:border-gray-700">
        <div class="flex items-center justify-between mb-2">
            <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">${item.company}</h5>
            <span class="text-sm text-gray-500 truncate dark:text-gray-400 ticker">
                ${item.ticker}
            </span>
        </div>
        <div class="text-sm card-info">
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        Current Price
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.priceCurrent} ${item.currency}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        Price Change
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.priceChange} ${item.priceChangePercentage}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        High
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.priceHigh}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        Low
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.priceLow}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        Open
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.priceOpen}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        Close
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.priceClose}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        P/E TTM Period, V
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.peTTMPeriod}, ${item.peTTMV}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        EPS Period, V
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.EPSPeriod}, ${item.EPSV}
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        NPM TTM
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.NPMTTM}
                </div>
            </div>
            <div class="flex items-center space-x-4 mb-2">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                        Market Cap
                    </p>
                </div>
                <div class="inline-flex items-center font-semibold text-gray-900 dark:text-white">
                    ${item.marketCap}
                </div>
            </div>
        </div>
        <button type="button"
            class="h-10 w-10 text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900 text-xl button-favorite">♡
        </button>
    </div>`;

    watchlistList.insertAdjacentHTML("beforeend", listHTML);
}

function updateFavoriteButtons() {
    buttonFavorites = document.querySelectorAll(".button-favorite");
}

function addListenerToFavoriteButtons() {
    buttonFavorites.forEach(btn => {
        btn.addEventListener("click", e => {
            let target = e.target;

            removeFromFavorites(target);
        });
    })
}

function removeFromFavorites(target) {
    // Remove from localStorage
    for (let i = 0; i < favorites.length; i++) {
        if (favorites[i]["ticker"] === target.closest(".card").querySelector(".ticker").innerText) {
            favorites.splice(i, 1);
            localStorage.setItem("stoutstonks-favorites", JSON.stringify(favorites));
        }
    }

    // Remove from DOM
    target.closest(".card").remove();

    toastDelete.classList.remove("hidden");

    setTimeout(function () {
        toastDelete.classList.add("hidden");
    }, 3000);
}

function refreshStocks() {
    removeWatchListCards();

    for (const item of favorites) {
        const input = item.ticker;

        setTimeout(() => {
            getQuote(input, "refresh", input);
            getBasicFinancials(input, "refresh", input);
            createHTMLElement(item);
        }, 1000);
    }
}

function removeWatchListCards() {
    const cards = document.querySelectorAll('.card');
    
    for (const card of cards) {
        card.remove();
    }
}

window.addEventListener("load", (e) => {
    // Check if favorites exists
    if (JSON.parse(window.localStorage.getItem("stoutstonks-favorites") === null)) {
        favorites = [];
    } else {
        favorites = JSON.parse(window.localStorage.getItem("stoutstonks-favorites"));

        for (const item of favorites) {
            createHTMLElement(item);
        }

        watchlistLoader.classList.add("hidden");

        updateFavoriteButtons();
        addListenerToFavoriteButtons();
    }

    getCompanyProfile("AAPL", "search");
    getQuote("AAPL", "search");
    getBasicFinancials("AAPL", "search");

    stockLoader.classList.add("hidden");
    stockList.classList.remove("hidden");
})