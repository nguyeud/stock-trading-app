const finnhub = require("finnhub");
const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "cedmv5iad3i32ebrltggcedmv5iad3i32ebrlth0";
const finnhubClient = new finnhub.DefaultApi();

// DOM Elements
const elemCompany = document.getElementById("company-name");
const elemTicker = document.getElementById("company-ticker");
const elemCurrency = document.getElementById("price-currency");
const elemCurrentPrice = document.getElementById("price-current");
const elemPriceShift = document.getElementById("price-shift");
const elemPriceShiftPercentage = document.getElementById("price-shift-percentage");

// Buttons
const buttonSearch = document.getElementById("button-search");
const buttonFavorite = document.getElementById("button-search");

buttonSearch.addEventListener("click", searchStocks);

function searchStocks() {
    event.preventDefault();

    const input = document.getElementById("stock-search").value.toUpperCase();

    getCompanyProfile(input)
    getQuote(input);
    getBasicFinancials(input);
}

function getCompanyProfile(input) {
    finnhubClient.companyProfile2({'symbol': `${input}`}, (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadCompanyProfile(data);
        }
    });
}

function getQuote(input) {
    finnhubClient.quote(`${input}`, (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadQuote(data);
        }
    });
}

function getBasicFinancials(input) {
    finnhubClient.companyBasicFinancials(`${input}`, "all", (error, data, response) => {
        if (error) {
            console.log("Error: ", error);
        } else {
            loadBasicFinancials(data);
        }
    });
}

function loadCompanyProfile (profile) {
    // Load information from API
    const company = profile.name;
    const ticker = profile.ticker;
    const industry = profile.finnhubIndustry;
    const exchange = profile.exchange;
    const currency = profile.currency;

    elemCompany = document.getElementById("company-name");
    elemTicker = document.getElementById("company-ticker");
    elemCurrency = document.getElementById("price-currency");

    elemCompany.innerText = company;
    elemTicker.innerText = ticker;
    elemCurrency.innerText = currency;
}

function loadQuote(quote) {
    // Load information from API
    const currentPrice = quote.c;
    const priceChange = quote.d;
    const priceChangePercentage = quote.dp;
    const priceHigh = quote.h;
    const priceLow = quote.l;
    const priceOpen = quote.o;
    const priceClose = quote.pc;

    elemCurrentPrice = document.getElementById("price-current");
    elemPriceShift = document.getElementById("price-shift");
    elemPriceShiftPercentage = document.getElementById("price-shift-percentage");

    elemCurrentPrice.innerText = currentPrice;
    elemPriceShift.innerText = priceChange;
    elemPriceShiftPercentage.innerText = priceChangePercentage;

    console.log(quote);
}

function loadBasicFinancials(financials) {
    // Load information from API
    const peTTMPeriod = financials.series.quarterly.peTTM[0].period;
    const peTTMV = financials.series.quarterly.peTTM[0].v;
    const epsPeriod = financials.series.quarterly.eps[0].period;
    const epsV = financials.series.quarterly.eps[0].v;
    const npmTTM = financials.metric.netProfitMarginTTM;
    const marketCap = financials.metric.marketCapitalization;
}

window.addEventListener("load", (e) => {
    getCompanyProfile("AAPL")
    getQuote("AAPL");
    getBasicFinancials("AAPL");
})