
const newsCard = document.getElementById('news-cards');
// Array

var newsDataArr = [];

// apis

const API_KEY = "bb64fbb7322af8dcae2fff59a2c951f3";
const HEADLINES_NEWS = "https://gnews.io/api/v4/top-headlines?token=bb64fbb7322af8dcae2fff59a2c951f3&lang=en";
window.onload = function() {    
    fetchHeadlines();
};

const fetchHeadlines = async () => {
    const response = await fetch(HEADLINES_NEWS);
    newsDataArr = [];
    if(response.status >=200 && response.status < 300) {
        const myJson = await response.json();
        newsDataArr = myJson.articles;
    } else {
      console.log(response.status, response.statusText);      
      return;
    }
    displayNews();
}
function displayNews() {
    newsDataArr.forEach(news => {
      const firstNews = `<div class="p-6 bg-white border border-gray-200 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700">
      <a href="#">
          <img class="rounded-t-lg" src="${news.image}" />
      </a>
      <div class="p-5">
          <div >
              <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">${news.title}</h5>
          </div>
          <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">${news.description}</p>
          <a href="${news.url}" target="_blank"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
              Read more
              <svg aria-hidden="true" class="w-4 h-4 ml-2 -mr-1" fill="currentColor" viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clip-rule="evenodd"></path>
              </svg>
          </a>
      </div>
  </div>`
      
  newsCard.insertAdjacentHTML("beforeend", firstNews)      
    });
}



