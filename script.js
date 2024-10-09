// Encapsulate global variables in an object to avoid global scope pollution
const appState = {
  currentImageUrl: "",
  card3Images: [],
  currentCard3ImageIndex: 0,
};

// Function to toggle the sidebar
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
}

// Event listener for the submit button in the prompt field
document.getElementById("submit").addEventListener("click", generateImage);

async function generateImage() {
  const promptInput = document.getElementById("promptInput");
  const prompt = promptInput.value;
  const style = document.querySelector("#field1 .icon-btn.active")?.id || "";
  const quality = document.querySelector("#field2 .icon-btn.active")?.id || "";
  const size = document.querySelector("#field3 .icon-btn.active")?.id || "";

  if (prompt.trim() === "") {
    alert("Please enter an image description.");
    return;
  }

  const imageContainerCard1 = document.querySelector(
    "#card1 .card1-image-container"
  );
  const loadingSpinnerCard1 = document.createElement("div");
  loadingSpinnerCard1.className = "unique-loading-spinner";
  imageContainerCard1.innerHTML = "";
  imageContainerCard1.appendChild(loadingSpinnerCard1);

  const imageContainerCard2 = document.querySelector(
    "#card2 .card2-image-container"
  );
  if (!imageContainerCard2) {
    console.error("Card2 image container not found.");
    return;
  }

  const retryCount = 3;
  const initialDelay = 1000;

  generate.disabled = true; // Disable generate button

  await fetchImageWithRetry(
    prompt,
    style,
    quality,
    size,
    imageContainerCard1,
    imageContainerCard2,
    loadingSpinnerCard1,
    retryCount,
    initialDelay
  );

  generate.disabled = false; // Enable generate button
}

async function fetchImageWithRetry(
  prompt,
  style,
  quality,
  size,
  imageContainerCard1,
  imageContainerCard2,
  loadingSpinnerCard1,
  retryCount,
  initialDelay,
  currentRetry = 0
) {
  try {
    const response = await fetch(
      "https://afsimage.azurewebsites.net/api/httpTriggerts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, style, quality, size }),
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    if (data.imageUrls) {
      const url = data.imageUrls[0];
      await handleImageLoad(
        url,
        prompt,
        size,
        imageContainerCard1,
        imageContainerCard2,
        loadingSpinnerCard1
      );
    } else {
      handleImageError(imageContainerCard1, loadingSpinnerCard1);
    }
  } catch (error) {
    console.error("Error generating image:", error);
    if (currentRetry < retryCount) {
      const delay = initialDelay * Math.pow(2, currentRetry);
      setTimeout(
        () =>
          fetchImageWithRetry(
            prompt,
            style,
            quality,
            size,
            imageContainerCard1,
            imageContainerCard2,
            loadingSpinnerCard1,
            retryCount,
            initialDelay,
            currentRetry + 1
          ),
        delay
      );
    } else {
      handleImageError(imageContainerCard1, loadingSpinnerCard1, true);
    }
  }
}

async function handleImageLoad(
  url,
  prompt,
  size,
  imageContainerCard1,
  imageContainerCard2,
  loadingSpinnerCard1
) {
  const imgCard1 = new Image();
  imgCard1.crossOrigin = "anonymous";
  imgCard1.src = url;
  imgCard1.alt = prompt;
  imgCard1.classList.add("card1-image");

  imgCard1.onload = async () => {
    loadingSpinnerCard1.remove();
    imageContainerCard1.innerHTML = "";
    imageContainerCard1.appendChild(imgCard1);
    appendButtons();
    recycleButton.disabled = false;
    deleteButton.disabled = false;
    appState.currentImageUrl = imgCard1.src;

    // Ensure imgCard2 is loaded properly
    const imgCard2 = new Image();
    imgCard2.crossOrigin = "anonymous";
    imgCard2.src = url;
    imgCard2.alt = prompt;
    imgCard2.classList.add("card2-image");

    imgCard2.onload = () => {
      imageContainerCard2.innerHTML = "";
      imageContainerCard2.appendChild(imgCard2);
      appendCard3Buttons();
      updateCarouselImages(url);
    };

    imgCard2.onerror = () =>
      handleImageError(imageContainerCard1, loadingSpinnerCard1);

    if (["Desktop", "Website", "Portrait", "Landscape"].includes(size)) {
      const dimensions = getImageDimensions(size);
      const resizedUrl = await resizeImage(
        url,
        dimensions.width,
        dimensions.height
      );
      imgCard1.src = resizedUrl;
      imgCard2.src = resizedUrl;
      updateCarouselImages(resizedUrl);
    }
  };

  imgCard1.onerror = () =>
    handleImageError(imageContainerCard1, loadingSpinnerCard1);
}

function getImageDimensions(size) {
  switch (size) {
    case "Desktop":
      return { width: 1600, height: 900 };
    case "Website":
      return { width: 1800, height: 600 };
    case "Portrait":
      return { width: 1080, height: 1920 };
    case "Landscape":
      return { width: 1920, height: 1080 };
    default:
      return { width: 0, height: 0 };
  }
}

function handleImageError(
  imageContainerCard1,
  loadingSpinnerCard1,
  isRetryExceeded = false
) {
  loadingSpinnerCard1.remove();
  imageContainerCard1.innerHTML = `  
      <span style="  
          color: #45474B;  
          font-weight: bold;  
          font-size: 60px;  
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);  
          background: -webkit-linear-gradient(#45474B, #6B6E73);  
          -webkit-background-clip: text;  
          -webkit-text-fill-color: transparent;  
      ">  
          ${
            isRetryExceeded
              ? "Failed to generate image after retries. Please try again later..."
              : "Failed to generate image. Please try again..."
          }  
      </span>`;
}

function resizeImage(url, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Image failed to load for resizing."));
    img.src = url;
  });
}

// Select the buttons
const recycleButton = document.getElementById("downloadButtonCard1");
const deleteButton = document.getElementById("deleteButtonCard1");
const downloadButton = document.getElementById("recycleButtonCard1");
const generate = document.getElementById("submit");

const leftArrowButtonCard3 = document.getElementById("leftArrowButtonCard2");
const rightArrowButtonCard3 = document.getElementById("rightArrowButtonCard2");
const copyButtonCard3 = document.getElementById("downloadButtonCard2");
const deleteButtonCard3 = document.getElementById("deleteButtonCard2");
const downloadButtonCard3 = document.getElementById("copyButtonCard2");

const card3ImageContainer = document.querySelector(".card2-image-container");

recycleButton.disabled = true;
deleteButton.disabled = true;

function appendButtons() {
  const imageContainer = document.querySelector(
    "#card1 .card1-image-container"
  );
  imageContainer.appendChild(recycleButton);
  imageContainer.appendChild(deleteButton);
  imageContainer.appendChild(downloadButton);
}

function appendCard3Buttons() {
  const card3ImageContainer = document.querySelector(".card2-image-container");
  card3ImageContainer.appendChild(leftArrowButtonCard3);
  card3ImageContainer.appendChild(rightArrowButtonCard3);
  card3ImageContainer.appendChild(copyButtonCard3);
  card3ImageContainer.appendChild(deleteButtonCard3);
  card3ImageContainer.appendChild(downloadButtonCard3);
}

document.querySelectorAll(".icon-btn").forEach((button) => {
  button.addEventListener("click", function () {
    const buttons = this.closest(".field").querySelectorAll(".icon-btn");
    buttons.forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
  });
});

downloadButton.addEventListener("click", () => {
  if (appState.currentImageUrl) {
    const link = document.createElement("a");
    link.href = appState.currentImageUrl;
    link.download = "generated_image.png";
    link.target = "_blank";
    link.click();
  } else {
    alert("No image to download.");
  }
});

deleteButton.addEventListener("click", () => {
  const imageContainer = document.querySelector(
    "#card1 .card1-image-container"
  );
  imageContainer.innerHTML = "";
  const sampleImage = new Image();
  sampleImage.src = "image1.png";
  sampleImage.alt = "Sample Image";
  sampleImage.classList.add("card2-image");
  imageContainer.appendChild(sampleImage);
  appendButtons();
  appState.currentImageUrl = "";
});

recycleButton.addEventListener("click", () => {
  if (appState.currentImageUrl) {
    const card3Image = new Image();
    card3Image.src = appState.currentImageUrl;
    card3Image.alt = "Previously Generated Image";
    card3Image.classList.add("card2-image");

    appState.card3Images.unshift(card3Image);
    displayCard3Image(0);
    generateImage();
    card3ImageContainer.scrollTop = 0;
  } else {
    alert("No image to regenerate.");
  }
});

leftArrowButtonCard3.addEventListener("click", () => {
  if (appState.card3Images.length > 0) {
    appState.currentCard3ImageIndex =
      (appState.currentCard3ImageIndex - 1 + appState.card3Images.length) %
      appState.card3Images.length;
    displayCard3Image(appState.currentCard3ImageIndex);
  }
});

rightArrowButtonCard3.addEventListener("click", () => {
  if (appState.card3Images.length > 0) {
    appState.currentCard3ImageIndex =
      (appState.currentCard3ImageIndex + 1) % appState.card3Images.length;
    displayCard3Image(appState.currentCard3ImageIndex);
  }
});

function displayCard3Image(index) {
  card3ImageContainer.innerHTML = "";
  if (appState.card3Images.length > 0) {
    const img = appState.card3Images[index];
    card3ImageContainer.appendChild(img);
    appendCard3Buttons();
  } else {
    const sampleImage = new Image();
    sampleImage.src = "image2.png";
    sampleImage.alt = "Sample Image";
    sampleImage.classList.add("card2-image");
    card3ImageContainer.appendChild(sampleImage);
    appendCard3Buttons();
  }
}

downloadButtonCard3.addEventListener("click", () => {
  if (
    appState.card3Images.length > 0 &&
    appState.currentCard3ImageIndex >= 0 &&
    appState.currentCard3ImageIndex < appState.card3Images.length
  ) {
    const link = document.createElement("a");
    link.href = appState.card3Images[appState.currentCard3ImageIndex].src;
    link.download = "generated_image.png";
    link.target = "_blank";
    link.click();
  } else {
    alert("No image to download.");
  }
});

deleteButtonCard3.addEventListener("click", () => {
  if (
    appState.card3Images.length > 0 &&
    appState.currentCard3ImageIndex >= 0 &&
    appState.currentCard3ImageIndex < appState.card3Images.length
  ) {
    appState.card3Images.splice(appState.currentCard3ImageIndex, 1);
    appState.currentCard3ImageIndex = Math.min(
      appState.currentCard3ImageIndex,
      appState.card3Images.length - 1
    );
    displayCard3Image(appState.currentCard3ImageIndex);
  } else {
    alert("No image to delete.");
  }
});

copyButtonCard3.addEventListener("click", () => {
  const promptText = document.getElementById("promptInput").value;
  if (promptText.trim() !== "") {
    navigator.clipboard
      .writeText(promptText)
      .then(() => alert("Prompt copied to clipboard successfully!"))
      .catch((err) => console.error("Error copying prompt:", err));
  } else {
    alert("No prompt text to copy.");
  }
});

document
  .getElementById("promptInput")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      document.getElementById("submit").click();
    }
  });

function updateCarouselImages(url) {
  const card3Image = new Image();
  card3Image.crossOrigin = "anonymous";
  card3Image.src = url;
  card3Image.alt = "Generated Image";
  card3Image.classList.add("card2-image");

  appState.card3Images.unshift(card3Image);
  appState.currentCard3ImageIndex = 0;
  displayCard3Image(appState.currentCard3ImageIndex);
}
