const finnhub = require("finnhub");
const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "ceegfgqad3i92ceaqo8gceegfgqad3i92ceaqo90";
const finnhubClient = new finnhub.DefaultApi();

let stockArray = ["AAPL", "META", "F"];
let unorderedPriceListTags;
const refreshList = document.getElementById("refresh");
const unorderedPriceList = document.getElementById("pricing-list");
refreshList.addEventListener("click", refreshStockData);

// const WebSocket = require('ws');
// let socket = new WebSocket('wss://ws.finnhub.io?token=ceegfgqad3i92ceaqo8gceegfgqad3i92ceaqo90');

// // Connection opened -> Subscribe
// socket.addEventListener('open', function (event) {
//     socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'AAPL'}))
//     socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'BINANCE:BTCUSDT'}))
//     socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'IC MARKETS:1'}))
// });

// // Listen for messages
// socket.addEventListener('message', function (event) {
//     console.log('Message from server ', event.data);
// });

// // Unsubscribe
//  var unsubscribe = function(symbol) {
//     socket.send(JSON.stringify({'type':'unsubscribe','symbol': symbol}))
// }
for (let i = 0; i < stockArray.length; i++) {
  let promise = new Promise(function(resolve, reject) {
  let arrayQuotes = [];
  let arrFinancials = [];
  finnhubClient.quote(stockArray[i], (error, data, response) => {
    if (error) {
      arrayQuotes.push("Please slow down refreshes", "", "", "");
    } else {
      arrayQuotes.push(
        stockArray[i] + ":" + data.c,
        "h:" + data.h,
        "l:" + data.l,
        "pc:" + data.pc
      );
    }
  });
  finnhubClient.companyBasicFinancials(
    stockArray[i],
    "all",
    (error, data, response) => {
      if (error) {
        arrFinancials.push("Please slow down refreshes", "", "", "");
      } else {
        arrFinancials.push(
          "p/e TTM:" +
            data.series.quarterly.peTTM[0].period +
            ", v:" +
            data.series.quarterly.peTTM[0].v,
          "eps:" +
            data.series.quarterly.eps[0].period +
            ", v:" +
            data.series.quarterly.eps[0].v,
          "npm TTM:" + data.metric.netProfitMarginTTM,
          "market cap:" + data.metric.marketCapitalization
        );
        // console.log(arrFinancials[0]);
      }
    }
  );
  //   console.log(arrayQuotes);
  //   console.log(arrFinancials);
  //   arrayQuotes.forEach(quote =>  {
  //     console.log(quote);
  //   })
  setTimeout(() => resolve("done"), 1000)
  console.log(arrayQuotes);
  console.log(arrFinancials);
  createStockElement(arrayQuotes, arrFinancials);
 });
}

// for (let i = 0; i < stockArray.length; i++) {
//   finnhubClient.companyBasicFinancials(stockArray[i],"all", (error, data, response) => {
//       if (error) {
//         let arrOfFinancials = ["Please slow down refreshes", "", "", ""].toString();
//         arrayFinancialObjects.push(arrOfFinancials);
//       } else {
//         const mapObjects = new Map([
//         [pe, "p/e TTM:" +
//             data.series.quarterly.peTTM[0].period +
//             ", v:" + data.series.quarterly.peTTM[0].v], [eps , "eps:" +
//             data.series.quarterly.eps[0].period +
//             ", v:" +
//             data.series.quarterly.eps[0].v] ,
//           [npm , "npm TTM:" + data.metric.netProfitMarginTTM],
//           [mktCap, "market cap:" + data.metric.marketCapitalization],
//         ])

//         mapFinancialObjects.set(i, mapObjects);
//       }
//     }
//   );
// }

// let newMap = arrayFinancialObjects.map(function(element) {
//     return 1$
// })

// function createStockItem() {
//   for (let i = 0; i < 6; i++) {
//     console.log(arrayQuoteObjects[i].pe);
//     createStockElement(arrayQuoteObjects[i], arrayFinancialObjects[i]);
//   }
// }

function refreshStockData() {
  removePriceItems();
  for (let i = 0; i < stockArray.length; i++) {
    finnhubClient.quote(stockArray[i], (error, data, response) => {
      if (error) {
        let arrOfPricing = ["Please slow down refreshes", "", "", ""];
        createPricingItem(arrOfPricing);
      } else {
        let arrOfPricing = [
          stockArray[i] + ":" + data.c,
          "h:" + data.h,
          "l:" + data.l,
          "pc:" + data.pc,
        ];
        createPricingItem(arrOfPricing);
      }
    });
  }
}

// function getBasicFinancials(stockSymbol) {
//   console.log(stockSymbol);
//   finnhubClient.companyBasicFinancials(
//     stockSymbol,
//     "all",
//     (error, data, response) => {
//       if (error) {
//         let arrOfFinancials = ["Please slow down refreshes", "", "", ""];
//         return arrOfFinancials;
//       } else {
//         let arrOfFinancials = [
//           "p/e TTM:" +
//             data.series.quarterly.peTTM[0].period +
//             ", v:" +
//             data.series.quarterly.peTTM[0].v,
//           "eps:" +
//             data.series.quarterly.eps[0].period +
//             ", v:" +
//             data.series.quarterly.eps[0].v,
//           "npm TTM:" + data.metric.netProfitMarginTTM,
//           "market cap:" + data.metric.marketCapitalization,
//         ];
//         console.log(arrOfFinancials);
//         return arrOfFinancials;
//       }
//     }
//   );
// }

function removePriceItems() {
  unorderedPriceListTags = unorderedPriceList.querySelectorAll("li");

  for (const tag of unorderedPriceListTags) {
    tag.remove();
  }
}

function createStockElement(pricingArray, financialArray) {
  const priceItemHtml = `
    <li class="py-3 sm:py-4">
      <div class="flex items-center space-x-4">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
            ${pricingArray[0]}
          </p>
          <p>${pricingArray[1]}</p>
          <p>${pricingArray[2]}</p>
          <p>${pricingArray[3]}</p>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
            ${financialArray[0]}
          </p>
          <p>${financialArray[1]}</p>
          <p>${financialArray[2]}</p>
          <p>${financialArray[3]}</p>
        </div>
        <div class="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
          $320
        </div>
      </div>
    </li>
  `;
  unorderedPriceList.insertAdjacentHTML("beforeend", priceItemHtml);
}

// sadf
