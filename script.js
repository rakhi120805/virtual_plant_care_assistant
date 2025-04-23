const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResultsContainer = document.getElementById('search-results');
const plantDetailsSection = document.getElementById('plant-details');
const plantInfoDiv = document.getElementById('plant-info');
const plantImage = document.getElementById('plant-image');
const plantCommonName = document.getElementById('plant-common-name');
const plantScientificName = document.getElementById('plant-scientific-name');
const wateringFrequency = document.getElementById('watering-frequency');
const waterTimerInput = document.getElementById('water-timer');
const wateringReminder = document.getElementById('watering-reminder');
const sunlightNeeds = document.getElementById('sunlight-needs');
const sunlightBadge = document.getElementById('sunlight-badge');
const waterAmount = document.getElementById('water-amount');
const notes = document.getElementById('notes');
const backButton = document.getElementById('back-button');
const appContainer = document.getElementById('app');
const searchSection = document.querySelector('#app > section:first-of-type');

const BACKEND_URL = 'http://127.0.0.1:5000/api'; // URL of your Flask backend

async function fetchPlants(query) {
  try {
    const response = await fetch(`${BACKEND_URL}/plants/search?q=${query}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    displaySearchResults(data.data);
  } catch (error) {
    console.error('Error fetching plants:', error);
    searchResultsContainer.innerHTML = '<p class="text-red-500">Failed to fetch plant data from backend.</p>';
  }
}

function displaySearchResults(plants) {
  searchResultsContainer.innerHTML = '';
  if (plants && plants.length > 0) {
    plants.forEach(plant => {
      const plantCard = document.createElement('div');
      plantCard.classList.add('bg-white', 'rounded-lg', 'shadow-sm', 'overflow-hidden');
      plantCard.innerHTML = `
        ${plant.image ? `<img src="${plant.image}" alt="${plant.common_name}" class="w-full h-32 object-cover">` : '<div class="w-full h-32 bg-gray-200 flex items-center justify-center text-gray-500">No Image</div>'}
        <div class="p-4">
          <h2 class="text-xl font-semibold text-gray-800">${plant.common_name || plant.scientific_name || 'Unknown Name'}</h2>
          <p class="text-gray-600 text-sm">${plant.scientific_name || ''}</p>
          <button class="view-details-button bg-green-400 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full mt-2" data-plant-id="${plant.id}">View Details</button>
        </div>
      `;
      searchResultsContainer.appendChild(plantCard);
    });

    document.querySelectorAll('.view-details-button').forEach(button => {
      button.addEventListener('click', function () {
        const plantId = this.dataset.plantId;
        fetchPlantDetails(plantId);
      });
    });
  } else {
    searchResultsContainer.innerHTML = '<p class="text-gray-500">No plants found matching your search.</p>';
  }
}

async function fetchPlantDetails(plantId) {
  try {
    const response = await fetch(`${BACKEND_URL}/plants/${plantId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    displayPlantDetails(data.data);
  } catch (error) {
    console.error('Error fetching plant details:', error);
    alert('Failed to load plant details from backend.');
  }
}

function displayPlantDetails(plant) {
  if (!plant) {
    alert('Plant details not found.');
    return;
  }
  plantCommonName.textContent = plant.common_name || 'Unknown Name';
  plantScientificName.textContent = plant.scientific_name || '';
  wateringFrequency.textContent = plant.watering ? `Watering: ${plant.watering}` : 'Watering information not available.';
  sunlightNeeds.textContent = plant.sunlight ? `Sunlight: ${plant.sunlight}` : 'Sunlight requirements not available.';
  waterAmount.textContent = plant.water_amount ? `Water Amount: ${plant.water_amount}` : 'Water amount information not available.';
  notes.textContent = plant.notes || '';
  plantImage.src = plant.image || 'placeholder-plant.jpg';
  plantImage.alt = plant.common_name || 'Plant Image';

  sunlightBadge.innerHTML = '';
  if (plant.sunlight) {
    const badgeText = plant.sunlight.toLowerCase();
    let badgeClass = '';
    if (badgeText.includes('full sun')) badgeClass = 'bg-yellow-200 text-yellow-700';
    else if (badgeText.includes('partial shade')) badgeClass = 'bg-gray-200 text-gray-700';
    else if (badgeText.includes('shade')) badgeClass = 'bg-green-200 text-green-700';

    const badge = document.createElement('span');
    badge.classList.add('inline-block', badgeClass, 'py-1', 'px-3', 'rounded-full', 'text-sm', 'mt-2');
    badge.textContent = plant.sunlight;
    sunlightBadge.appendChild(badge);
  }

  searchSection.classList.add('hidden');
  plantDetailsSection.classList.remove('hidden');
  loadSavedReminder(plant.common_name);
}

searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) fetchPlants(query);
});

searchInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') searchButton.click();
});

backButton.addEventListener('click', () => {
  plantDetailsSection.classList.add('hidden');
  searchSection.classList.remove('hidden');
});

// --- Watering Timer Functionality ---
waterTimerInput.addEventListener('change', () => {
  const selectedTime = new Date(waterTimerInput.value);
  const currentPlantName = plantCommonName.textContent.toLowerCase().replace(/\s+/g, '-');
  if (!isNaN(selectedTime) && currentPlantName) {
    localStorage.setItem(`wateringReminder-${currentPlantName}`, selectedTime.toISOString());
    updateWateringReminderDisplay(selectedTime);
  } else {
    wateringReminder.textContent = '';
  }
});

function updateWateringReminderDisplay(reminderTime) {
  const now = new Date();
  const difference = reminderTime.getTime() - now.getTime();

  if (difference > 0) {
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    wateringReminder.textContent = `Next watering in ${days} days, ${hours} hours, and ${minutes} minutes.`;
  } else if (difference <= 0 && reminderTime.getTime() !== 0) {
    wateringReminder.textContent = 'It\'s time to water your plant!';
  } else {
    wateringReminder.textContent = '';
  }
}

function loadSavedReminder(plantName) {
  const reminderTimeISO = localStorage.getItem(`wateringReminder-${plantName.toLowerCase().replace(/\s+/g, '-')}`);
  if (reminderTimeISO) {
    const reminderTime = new Date(reminderTimeISO);
    waterTimerInput.valueAsDate = reminderTime;
    updateWateringReminderDisplay(reminderTime);
  } else {
    waterTimerInput.value = '';
    wateringReminder.textContent = '';
  }
}

plantDetailsSection.classList.add('hidden');

// --- Enhanced Chatbot UI ---
const chatbotModal = document.getElementById("chatbotModal");
const chatbotButton = document.getElementById("chatbotButton");
const chatbotClose = document.querySelector(".close");
const messages = document.getElementById("chatbot-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");

chatbotButton.onclick = () => chatbotModal.classList.remove("hidden");
chatbotClose.onclick = () => chatbotModal.classList.add("hidden");
window.onclick = (e) => { if (e.target == chatbotModal) chatbotModal.classList.add("hidden"); };

function displayMessage(text, type) {
  const div = document.createElement("div");
  div.className = `p-3 max-w-[90%] rounded-lg shadow-sm ${
    type === 'user'
      ? 'ml-auto bg-green-100 text-green-900 text-right'
      : 'mr-auto bg-gray-100 text-gray-800 text-left'
  }`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

sendButton.onclick = () => {
  const userText = userInput.value.trim();
  if (!userText) return;
  displayMessage(userText, 'user');
  userInput.value = '';

  fetch("/gemini_query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: userText })
  })
    .then(res => res.json())
    .then(data => displayMessage(data.response, 'bot'))
    .catch(() => displayMessage("Something went wrong. Please try again.", 'bot'));
};

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendButton.click();
});
