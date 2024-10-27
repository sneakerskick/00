// Flash Sale Slider
  const slider = document.querySelector('.flash-sale-products');
  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    slider.classList.add('active');
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.classList.remove('active');
  });

  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.classList.remove('active');
  });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return; // Stop the function if not being dragged
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2; // The higher the multiplier, the faster the scroll
    slider.scrollLeft = scrollLeft - walk;
  });

// Lazy Loading Function

  document.addEventListener("DOMContentLoaded", function () {
    const lazyImages = document.querySelectorAll("img.lazy");

    if ("IntersectionObserver" in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    image.src = image.dataset.src;
                    image.classList.remove("lazy");
                    observer.unobserve(image);
                }
            });
        });

        lazyImages.forEach(image => {
            imageObserver.observe(image);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        const lazyLoad = () => {
            lazyImages.forEach(image => {
                if (image.getBoundingClientRect().top < window.innerHeight && image.getBoundingClientRect().bottom > 0) {
                    image.src = image.dataset.src;
                    image.classList.remove("lazy");
                }
            });
        };

        window.addEventListener("scroll", lazyLoad);
        window.addEventListener("resize", lazyLoad);
        window.addEventListener("orientationchange", lazyLoad);
    }
});


// cache data

const CACHE_DB_NAME = "ProductCacheDB";
const CACHE_STORE_NAME = "products";
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Open the IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_DB_NAME, 1);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME, { keyPath: "id" });
            }
        };
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = function (event) {
            reject("Failed to open database");
        };
    });
}

// Save data to IndexedDB
function saveDataToCache(db, data) {
    const transaction = db.transaction(CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(CACHE_STORE_NAME);
    data.categories.forEach(category => {
        category.products.forEach(product => {
            product.cacheTimestamp = Date.now(); // Add a timestamp for expiration
            store.put(product);
        });
    });
}

// Load data from IndexedDB
function loadDataFromCache(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CACHE_STORE_NAME, "readonly");
        const store = transaction.objectStore(CACHE_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = function () {
            reject("Failed to load data from cache");
        };
    });
}

// Check if data is expired
function isCacheExpired(cachedData) {
    if (!cachedData || cachedData.length === 0) {
        return true; // No data in cache
    }
    // Check the timestamp of the first product (assuming all products are updated together)
    const currentTime = Date.now();
    return currentTime - cachedData[0].cacheTimestamp > CACHE_EXPIRATION_MS;
}

// Fetch data from the JSON file and update the cache
async function fetchAndCacheData(jsonUrl) {
    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();
        const db = await openDatabase();
        saveDataToCache(db, data);
        return data;
    } catch (error) {
        console.error("Error fetching JSON data:", error);
        throw error;
    }
}

// Main function to get the data, either from cache or by fetching
async function getCachedData(jsonUrl) {
    const db = await openDatabase();
    const cachedData = await loadDataFromCache(db);

    if (isCacheExpired(cachedData)) {
        console.log("Cache expired or not available, fetching new data...");
        return fetchAndCacheData(jsonUrl);
    } else {
        console.log("Using cached data");
        return cachedData;
    }
}

// Function to update the product cards on the homepage using cached data
// Function to update the product cards on the homepage using cached data
function updateProductCardsWithCache(data) {
    if (!data || !data.categories || !Array.isArray(data.categories)) {
        console.error("Invalid data format: 'categories' not found");
        return;
    }

    const productCards = document.querySelectorAll('.product-card');
    
    data.categories.forEach(category => {
        if (!category.products || !Array.isArray(category.products)) {
            console.error("Invalid category format: 'products' not found");
            return;
        }

        category.products.forEach(product => {
            // Find the corresponding product card by matching the 'id'
            productCards.forEach(card => {
                const linkElement = card.querySelector('a');
                const imgElement = card.querySelector('img');
                const productId = linkElement.getAttribute('href').split('id=')[1].split('|')[0];

                if (productId === product.id) {
                    // Use the cached data to set the image source
                    imgElement.setAttribute('data-src', product.image);
                    imgElement.setAttribute('alt', product.productText.title);
                    // Optionally, load the image immediately
                    imgElement.src = product.image; 
                }
            });
        });
    });
}

// Usage example
const jsonFilePath = "products.json";
getCachedData(jsonFilePath)
    .then(data => {
        console.log("Product Data:", data);
        // Process the data as needed
        updateProductCardsWithCache(data); // Update the product cards
    })
    .catch(error => {
        console.error("Failed to load product data:", error);
    });
