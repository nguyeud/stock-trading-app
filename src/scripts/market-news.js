const finnhub = require("finnhub");

const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "cedmv5iad3i32ebrltggcedmv5iad3i32ebrlth0";

const finnhubClient = new finnhub.DefaultApi();
const viewNews = document.getElementById("news-view");
const listNews = document.getElementById("news-list");

viewNews.addEventListener("click", viewNews);

function createList() {
    finnhubClient.marketNews("general", {}, (error, data, response) => {
        const dataArray = data;

        for (let i = 0; i < 10; i++) {
            const id = i;
            const image = dataArray[i].image;
            const title = dataArray[i].headline;
            const link = dataArray[i].url;
            createNewsItem(id, image, title, link);
        }
    })
}

function createNewsItem(id, image, title, link) {
    let tagClass;
    if (id === 9 || id === 19) {
        tagClass = "pt-3 pb-0 sm:pt-4";
    } else {
        tagClass = "py-3 sm:py-4";
    }

    const itemHTML = 
    `<li class=${tagClass}>
        <div class="flex space-x-4">
            <img class="flex-shrink-0 w-24 h-24 md:w-14 md:h-14 lg:w-24 lg:h-24 rounded-md object-cover" src=${image}>
            <a class="text-base font-medium text-gray-900 dark:text-white line-clamp-3" href=${link}>
                ${title}
            </a>
        </div>
    </li>`;

    listNews.insertAdjacentHTML("beforeend", itemHTML);
}

// On window load
window.addEventListener("load", (e) => {
    createList();
})