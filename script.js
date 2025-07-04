// Script to handle the form information and display on the screen
// get the form and the entries container
const form = document.querySelector(".entry-form");
const entriesContainer = document.getElementById("entries-container");
const editForm = document.querySelector(".edit-form");

const modal = document.getElementById("entry-modal");
const openBtn = document.getElementById("open-modal-btn");
const closeBtn = document.querySelector(".close-btn");

const editModal = document.getElementById("edit-modal");
const closeEdit = document.querySelector(".close");

let editingCard = null;
let imageURLs = [];
let fileNames = [];
let editImageURLs = [];
let editPreviewList = document.getElementById("edit-preview-list");

// open add entry Modal
openBtn.onclick = () => (modal.style.display = "block");
closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => {
  if (e.target == modal) modal.style.display = "none";
  if (e.target == editModal) editModal.style.display = "none";
};

// close edit entry Modal
closeEdit.onclick = () => (editModal.style.display = "none");

// ADD ENTRY functionality
form.addEventListener("submit", function (e) {
  e.preventDefault();
  //get the date and description value
  const date = document.getElementById("entry-date").value;
  const description = document.getElementById("entry-description").value;

  if (date && description) {
    const entryCard = document.createElement("div");
    entryCard.classList.add("entry-card");

    entryCard.innerHTML = `
        <h3>${date}</h3>
        ${
          fileNames.length > 0
            ? `<div class ="images-container">
            ${imageURLs
              .map((url) => `<img src = ${url} class = "entry-image">`)
              .join("")}
        </div> `
            : ""
        }
        <p>${description}</p>
        <div class="entry-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      `;

    // Delete functionality
    entryCard.querySelector(".delete-btn").addEventListener("click", () => {
      entryCard.remove();
      saveEntriesToLocalStorage();
    });
    // EDIT FUNCTIONALITY
    entryCard.querySelector(".edit-btn").addEventListener("click", () => {
      editingCard = entryCard;
      editModal.style.display = "block";
      // Get the current date and description from the entry card selected
      const currentDate = entryCard.querySelector("h3").textContent;
      const currentDescription = entryCard.querySelector("p").textContent;
      const currentImages = Array.from(entryCard.querySelectorAll("img")).map(
        (img) => img.src
      );

      editImageURLs = [...currentImages];
      editPreviewList.innerHTML = "";

      editImageURLs.forEach((url, index) => {
        setTimeout(() => {
          const item = document.createElement("div");
          item.classList.add("file-preview-item");
          item.innerHTML = `<span>Image ${
            index + 1
          }</span><span style="color:red">&times;</span>`;
          editPreviewList.appendChild(item);

          item.addEventListener("click", () => {
            const idx = editImageURLs.indexOf(url);
            if (idx !== -1) {
              editImageURLs.splice(idx, 1);
              editPreviewList.removeChild(item);
            }
          });
        }, 0);
      });

      document.getElementById("edit-date").value = currentDate;
      document.getElementById("edit-description").value = currentDescription;
    });

    entriesContainer.prepend(entryCard); // Newest entries first
    saveEntriesToLocalStorage();         // 🔥 Add this

    form.reset();
    modal.style.display = "none";
    imageURLs = [];
    fileNames = [];
    previewList.innerHTML = "";
  }
});
// Edit form on submit functionality
editForm.addEventListener("submit", function (e) {
  e.preventDefault();

  if (editingCard) {
    const newDate = document.getElementById("edit-date").value;
    const newDescription = document.getElementById("edit-description").value;

    // updating the card
    editingCard.querySelector("h3").textContent = newDate;
    editingCard.querySelector("p").textContent = newDescription;

    let imageContainer = editingCard.querySelector(".images-container");

    if (imageContainer) {
      imageContainer.remove();
    }

    if (editImageURLs.length > 0) {
      imageContainer = document.createElement("div");
      imageContainer.classList.add("images-container");

      editImageURLs.forEach((url) => {
        const img = document.createElement("img");
        img.src = url;
        img.classList.add("entry-image");
        imageContainer.appendChild(img);
      });
      editImageURLs = [];
      editPreviewList.innerHTML = "";
      editImageInput.value = "";

      editingCard.insertBefore(imageContainer, editingCard.querySelector("p"));
    }

    editModal.style.display = "none";
    saveEntriesToLocalStorage();
  }
});

// Image preview for when images are added
// When image is selected, convert it to base64
let imageInput = document.getElementById("entry-image");
let previewList = document.getElementById("entry-preview-list");
imageURLs = [];
fileNames = [];
previewList.innerHTML = "";

// Event Function to handle when image input is added when adding an entry
imageInput.addEventListener("change", function (e) {
  const files = e.target.files;
  // using the file reader to read each file
  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      imageURLs.push(event.target.result);
      fileNames.push(file.name);

      let item = document.createElement("div");
      item.classList.add("file-preview-item");
      item.innerHTML = `<span>${file.name} </span><span>&times </span>`;
      previewList.appendChild(item);

      // Handle the item removal

      item.addEventListener("click", () => {
        let index = Array.from(previewList.children).indexOf(item);
        imageURLs.splice(index, 1);
        fileNames.splice(index, 1);
        previewList.removeChild(item);
      });
    };
    reader.readAsDataURL(file);
  });
});

// image lines for when images are to be edited
let editImageInput = document.getElementById("edit-image");

editImageInput.addEventListener("change", function (e) {
  const files = e.target.files;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      editImageURLs.push(event.target.result);

      let item = document.createElement("div");
      item.classList.add("file-preview-item");
      item.innerHTML = `<span>${file.name} </span><span>&times </span>`;
      editPreviewList.appendChild(item);

      item.addEventListener("click", () => {
        const index = editImageURLs.indexOf(event.target.result);
        if (index !== -1) {
          editImageURLs.splice(index, 1);
        }
        editPreviewList.removeChild(item);
      });
    };
    reader.readAsDataURL(file);
  });
});

const toggleBtn = document.getElementById("toggle-btn");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});


// Building the local Storage Part of this  code
function saveEntriesToLocalStorage() {
  const entries = Array.from(document.querySelectorAll(".entry-card")).map(card => {
    return {
      date: card.querySelector("h3").textContent,
      description: card.querySelector("p").textContent,
      images: Array.from(card.querySelectorAll("img")).map(img => img.src),
    };
  });

  localStorage.setItem("siwesEntries", JSON.stringify(entries));
}

window.addEventListener("DOMContentLoaded", () => {
  const stored = localStorage.getItem("siwesEntries");
  if (stored) {
    const entries = JSON.parse(stored);
    entries.forEach(entry => {
      const entryCard = document.createElement("div");
      entryCard.classList.add("entry-card");

      entryCard.innerHTML = `
        <h3>${entry.date}</h3>
        ${
          entry.images.length > 0
            ? `<div class="images-container">
                ${entry.images.map((url) => `<img src="${url}" class="entry-image">`).join("")}
              </div>`
            : ""
        }
        <p>${entry.description}</p>
        <div class="entry-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      `;

      // Delete functionality
      entryCard.querySelector(".delete-btn").addEventListener("click", () => {
        entryCard.remove();
        saveEntriesToLocalStorage();
      });

      // Edit functionality — reuse your edit code here
      entryCard.querySelector(".edit-btn").addEventListener("click", () => {
        editingCard = entryCard;
        editModal.style.display = "block";

        const currentDate = entry.date;
        const currentDescription = entry.description;
        const currentImages = entry.images;

        editImageURLs = [...currentImages];
        editPreviewList.innerHTML = "";

        editImageURLs.forEach((url, index) => {
          const item = document.createElement("div");
          item.classList.add("file-preview-item");
          item.innerHTML = `<span>Image ${index + 1}</span><span class="remove">&times</span>`;
          editPreviewList.appendChild(item);

          item.querySelector(".remove").addEventListener("click", () => {
            editImageURLs.splice(index, 1);
            item.remove();
          });
        });

        document.getElementById("edit-date").value = currentDate;
        document.getElementById("edit-description").value = currentDescription;
      });

      entriesContainer.prepend(entryCard);
    });
  }
});
