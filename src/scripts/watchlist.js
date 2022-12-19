const finnhub = require("finnhub");
const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "cedmv5iad3i32ebrltggcedmv5iad3i32ebrlth0";
const finnhubClient = new finnhub.DefaultApi();

// DOM Elements
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
    company = profile.name;
    ticker = profile.ticker;
    industry = profile.finnhubIndustry;
    exchange = profile.exchange;
    currency = profile.currency;

    elemCompany.innerText = company;
    elemTicker.innerText = ticker;
    elemIndustry.innerText = industry;
    elemExchange.innerText = exchange
    elemCurrency.innerText = currency;
}

function loadQuote(quote) {
    // Load information from API
    currentPrice = quote.c;
    priceChange = quote.d;
    priceChangePercentage = quote.dp;
    priceHigh = quote.h;
    priceLow = quote.l;
    priceOpen = quote.o;
    priceClose = quote.pc;

    elemCurrentPrice.innerText = currentPrice;
    elemPriceShift.innerText = priceChange;
    elemPriceShiftPercentage.innerText = `(${priceChangePercentage}%)`;
    elemPriceHigh.innerText = `$${priceHigh}`;
    elemPriceLow.innerText = `$${priceLow}`;
    elemPriceOpen.innerText = `$${priceOpen}`;
    elemPriceClose.innerText = `$${priceClose}`;
}

function loadBasicFinancials(financials) {
    // Load information from API
    const peTTMPeriod = financials.series.quarterly.peTTM[0].period;
    const peTTMV = financials.series.quarterly.peTTM[0].v;
    const epsPeriod = financials.series.quarterly.eps[0].period;
    const epsV = financials.series.quarterly.eps[0].v;
    const NPMTTM = financials.metric.netProfitMarginTTM;
    const marketCap = financials.metric.marketCapitalization;

    elemPETTMPeriod.innerText = peTTMPeriod;
    elemPETTMV.innerText = peTTMV;
    elemEPSPeriod.innerText = epsPeriod;
    elemEPSV.innerText = epsV;
    elemNPMTTM.innerText = NPMTTM;
    elemMarketCap.innerText = marketCap;
}

window.addEventListener("load", (e) => {
    getCompanyProfile("AAPL")
    getQuote("AAPL");
    getBasicFinancials("AAPL");
})