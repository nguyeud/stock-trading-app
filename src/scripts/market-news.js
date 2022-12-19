const finnhub = require("finnhub");
const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = "cedmv5iad3i32ebrltggcedmv5iad3i32ebrlth0";
const finnhubClient = new finnhub.DefaultApi();

const unorderedList = document.getElementById("news-list");
const loader = document.getElementById("news-loader");
const view = document.getElementById("news-view");

let unorderedListTags;

view.addEventListener("click", viewMoreOrLess);

// On window load or callback, create list of news items
function createList(num) {
    finnhubClient.marketNews("general", {}, (error, data, response) => {
        const dataArray = data;

        for (let i = 0; i < num; i++) {
            const image = dataArray[i].image;
            const title = dataArray[i].headline;
            const link = dataArray[i].url;
            createNewsItem(image, title, link);
        }

        // Hide loader
        loader.classList.add("hidden");
    })
}

function createNewsItem(image, title, link) {
    const itemHTML = 
    `<li class="py-3 sm:py-4 pr-4">
        <div class="flex space-x-4">
            <img class="flex-shrink-0 w-24 h-24 md:w-14 md:h-14 lg:w-24 lg:h-24 rounded-md object-cover" src=${image}>
            <a class="text-base font-medium text-gray-900 dark:text-white line-clamp-3" href=${link}>
                ${title}
            </a>
        </div>
    </li>`;

    unorderedList.insertAdjacentHTML("beforeend", itemHTML);
}

function removeNewsItems() {
    unorderedListTags = unorderedList.querySelectorAll("li");

    for (const tag of unorderedListTags) {
        tag.remove();
    }

    // Display loader
    loader.classList.remove("hidden");
}

function viewMoreOrLess() {
    if (view.innerText === "View more") {
        viewMore();
    } else {
        viewLess();
    }
}

function viewMore() {
    view.innerText = "View less";
    removeNewsItems();
    createList(10);
}

function viewLess() {
    view.innerText = "View more";
    removeNewsItems();
    createList(5);
}

// On window load
window.addEventListener("load", (e) => {
    createList(5);
})