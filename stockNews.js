const finnhub = require("finnhub");

const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "cedoo5aad3i32ebrn3f0cedoo5aad3i32ebrn3fg ";
const finnhubClient = new finnhub.DefaultApi();
const viewAllNews = document.getElementById("viewAllNews");
const viewLessNews = document.getElementById("viewLessNews");
viewAllNews.addEventListener("click", addMoreNews);
viewLessNews.addEventListener("click", addLessnews);


finnhubClient.marketNews("general", {}, (error, data, response) => {
  const map1 = data;
  for (let i = 0; i < 10; i++) {
    let headlineElement = map1[i].headline;
    let newsTextLink = map1[i].url;
    let newContent = createNewsItem(map1[i].image, headlineElement, newsTextLink);
    document
      .getElementById("flowRoot")
      .insertAdjacentHTML("beforeend", newContent);
  }
});

function createNewsItem(imgNews, newsItem, newsLink) {
  let contentNews = null;
  contentNews = `<li class="py-2 sm:py-2 border-2 underline" id="listItem">
  <div class="flex items-center space-x-4">
      <div class="flex-shrink-0">
          <img class="w-12 h-12" src="${imgNews}" alt="">
      </div>
      <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate dark:text-white"><a href="${newsLink}">
              ${newsItem}
          </a></p>
      </div>
      
  </div>
</li>`;
  return contentNews;
}

function addMoreNews() {
  document.querySelectorAll("#listItem").forEach(e => e.remove());
  finnhubClient.marketNews("general", {}, (error, data, response) => {
    const map1 = data;
    for (let i = 0; i < 50; i++) {
      let headlineElement = map1[i].headline;
      let newsTextLink = map1[i].url;
      let newContent = createNewsItem(map1[i].image, headlineElement, newsTextLink);
      document
        .getElementById("flowRoot")
        .insertAdjacentHTML("beforeend", newContent);
    }
  });
}

function addLessnews() {
  document.querySelectorAll("#listItem").forEach(e => e.remove());
  finnhubClient.marketNews("general", {}, (error, data, response) => {
    const map1 = data;
    for (let i = 0; i < 10; i++) {
      let headlineElement = map1[i].headline;
      let newsTextLink = map1[i].url;
      let newContent = createNewsItem(map1[i].image, headlineElement, newsTextLink);
      document
        .getElementById("flowRoot")
        .insertAdjacentHTML("beforeend", newContent);
    }
  });
}
