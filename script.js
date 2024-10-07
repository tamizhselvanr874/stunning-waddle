document.addEventListener("DOMContentLoaded", () => {
    let isGenerating = false;

    // Function to toggle the sidebar
    function toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.toggle("active");
        }
    }

    // Event listener for the submit button in the prompt field
    const submitButton = document.getElementById("submit");
    if (submitButton) {
        submitButton.addEventListener("click", () => {
            if (!isGenerating) {
                generateImage();
            }
        });
    }

    // Function to generate an image
    function generateImage() {
        const promptInput = document.getElementById("promptInput");
        const prompt = promptInput ? promptInput.value : "";
        const style = document.querySelector("#field1 .icon-btn.active")?.id || "";
        const quality = document.querySelector("#field2 .icon-btn.active")?.id || "";
        const size = document.querySelector("#field3 .icon-btn.active")?.id || "";
        const guide = document.querySelector("#field4 .icon-btn.active")?.id || "";

        if (prompt.trim() === "") {
            alert("Please enter an image description.");
            return;
        }

        const imageContainerCard1 = document.querySelector("#card1 .card1-image-container");
        const loadingSpinnerCard1 = document.createElement("div");
        loadingSpinnerCard1.className = "unique-loading-spinner";
        imageContainerCard1.innerHTML = "";
        imageContainerCard1.appendChild(loadingSpinnerCard1);

        const imageContainerCard2 = document.querySelector("#card2 .card2-image-container");

        const retryCount = 3;
        const initialDelay = 1000;
        let currentRetry = 0;

        // Fetches image from the server and retries on failure
        function fetchImageWithRetry() {
            isGenerating = true;

            fetch("https://afsimage.azurewebsites.net/api/httpTriggerts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt, style, quality, size }),
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.imageUrls) {
                        const url = data.imageUrls[0];
                        loadImages(url, prompt, size, imageContainerCard1, imageContainerCard2);
                    } else {
                        handleImageError(imageContainerCard1);
                    }
                })
                .catch(error => {
                    console.error("Error generating image:", error);
                    handleRetry(fetchImageWithRetry, currentRetry, retryCount, initialDelay, loadingSpinnerCard1, imageContainerCard1);
                    currentRetry++;
                })
                .finally(() => {
                    isGenerating = false;  // Reset the flag on completion
                });
        }

        // Initial fetch attempt
        fetchImageWithRetry();
    }

    // Loads the generated images into the containers
    function loadImages(url, prompt, size, imageContainerCard1, imageContainerCard2) {
        const imgCard1 = new Image();
        const imgCard2 = new Image();
        imgCard1.src = url;
        imgCard2.src = url;
        imgCard1.alt = prompt;
        imgCard2.alt = prompt;
        imgCard1.classList.add("card1-image");
        imgCard2.classList.add("card2-image");

        imgCard1.onload = () => {
            updateImageContainers(imageContainerCard1, imgCard1);
            updateImageContainers(imageContainerCard2, imgCard2);
            handleSizeResize(size, url, imgCard1, imgCard2);
        };
    }

    // Updates the image containers with new images
    function updateImageContainers(container, image) {
        if (container) {
            container.innerHTML = "";
            container.appendChild(image);
        }
    }

    // Handles retries in case the fetch fails
    function handleRetry(fetchImageFunc, currentRetry, retryCount, delay, loadingSpinnerCard1, imageContainerCard1) {
        if (currentRetry < retryCount) {
            const retryDelay = delay * Math.pow(2, currentRetry);
            setTimeout(fetchImageFunc, retryDelay);
        } else {
            handleImageError(imageContainerCard1);
        }
    }

    // Displays error message if image generation fails
    function handleImageError(imageContainerCard1) {
        if (imageContainerCard1) {
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
                    Failed to generate image. Please try again...
                </span>`;
        }
    }

    // Resizes the image based on selected size
    function handleSizeResize(size, url, imgCard1, imgCard2) {
        if (["Desktop", "Website", "Portrait", "Landscape"].includes(size)) {
            let width, height;
            switch (size) {
                case "Desktop":
                    [width, height] = [1600, 900];
                    break;
                case "Website":
                    [width, height] = [1800, 600];
                    break;
                case "Portrait":
                    [width, height] = [1080, 1920];
                    break;
                case "Landscape":
                    [width, height] = [1920, 1080];
                    break;
            }
            resizeImage(url, width, height).then(resizedUrl => {
                imgCard1.src = resizedUrl;
                imgCard2.src = resizedUrl;
            }).catch(error => {
                console.error("Error resizing image:", error);
            });
        }
    }

    // Resizes the image to the desired width and height
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

                canvas.toBlob(blob => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve(reader.result);
                        };
                        reader.readAsDataURL(blob);
                    } else {
                        reject(new Error("Failed to create a blob from the canvas."));
                    }
                }, "image/png");
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    // Event listener for selecting active buttons
    document.querySelectorAll(".icon-btn").forEach(button => {
        button.addEventListener("click", function () {
            const buttons = this.closest(".field").querySelectorAll(".icon-btn");
            buttons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
        });
    });

    // Ensures buttons are added correctly and event listeners are attached
    function appendButtons(imageContainer, buttons) {
        buttons.forEach(button => {
            imageContainer.appendChild(button);
        });
    }
});
