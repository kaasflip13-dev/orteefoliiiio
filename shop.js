"use strict";


/* =========================================================
   ECHOBOUND SUPPLY TERMINAL
   ========================================================= */


/* -----------------------------
   STORAGE
----------------------------- */

const CREDIT_KEY = "echobound_shop_credits";
const INVENTORY_KEY = "echobound_shop_inventory";


/* -----------------------------
   DEFAULT DATA
----------------------------- */

let credits = Number(
    localStorage.getItem(CREDIT_KEY)
);

if (!Number.isFinite(credits)) {
    credits = 1000;
}

let inventory;

try {
    inventory = JSON.parse(
        localStorage.getItem(INVENTORY_KEY)
    );

    if (!Array.isArray(inventory)) {
        inventory = [];
    }
} catch {
    inventory = [];
}


/* -----------------------------
   ELEMENTS
----------------------------- */

const creditsElement =
    document.getElementById("credits");

const products =
    document.querySelectorAll(".productCard");

const categoryButtons =
    document.querySelectorAll(".category");

const itemCount =
    document.getElementById("itemCount");

const inventoryList =
    document.getElementById("inventoryList");

const notification =
    document.getElementById("notification");

const notificationTitle =
    document.getElementById("notificationTitle");

const notificationText =
    document.getElementById("notificationText");


/* -----------------------------
   UPDATE CREDITS
----------------------------- */

function updateCredits() {

    creditsElement.textContent =
        credits.toLocaleString("nl-NL");

    localStorage.setItem(
        CREDIT_KEY,
        String(credits)
    );
}


/* -----------------------------
   SAVE INVENTORY
----------------------------- */

function saveInventory() {

    localStorage.setItem(
        INVENTORY_KEY,
        JSON.stringify(inventory)
    );
}


/* -----------------------------
   NOTIFICATION
----------------------------- */

let notificationTimer = null;

function showNotification(title, text) {

    notificationTitle.textContent = title;

    notificationText.textContent = text;

    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {

        notification.classList.remove("show");

    }, 2800);
}


/* -----------------------------
   BUY ITEM
----------------------------- */

function buyItem(button) {

    const name =
        button.dataset.name;

    const price =
        Number(button.dataset.price);

    if (
        !name ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        return;
    }


    if (credits < price) {

        showNotification(
            "PURCHASE DENIED",
            "Not enough credits."
        );

        return;
    }


    credits -= price;

    inventory.push({
        name: name,
        price: price,
        boughtAt: Date.now()
    });


    updateCredits();

    saveInventory();

    renderInventory();


    showNotification(
        "PURCHASE COMPLETE",
        `${name} added to inventory.`
    );
}


/* -----------------------------
   BUY BUTTONS
----------------------------- */

document
    .querySelectorAll(".buyButton")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                buyItem(button);

            }
        );

    });


/* -----------------------------
   CATEGORY FILTER
----------------------------- */

categoryButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const category =
                button.dataset.category;


            categoryButtons.forEach(
                otherButton => {

                    otherButton.classList.remove(
                        "active"
                    );

                }
            );


            button.classList.add("active");


            let visibleCount = 0;


            products.forEach(product => {

                const productCategory =
                    product.dataset.category;


                const show =
                    category === "all" ||
                    productCategory === category;


                product.style.display =
                    show ? "" : "none";


                if (show) {
                    visibleCount++;
                }

            });


            itemCount.textContent =
                `${visibleCount} ITEMS`;

        }
    );

});


/* -----------------------------
   INVENTORY
----------------------------- */

function renderInventory() {

    if (inventory.length === 0) {

        inventoryList.innerHTML = `
            <div class="emptyInventory">

                <div class="emptyIcon">
                    ◇
                </div>

                <h3>
                    INVENTORY EMPTY
                </h3>

                <p>
                    Purchased equipment will appear here.
                </p>

            </div>
        `;

        return;
    }


    inventoryList.innerHTML = "";


    inventory.forEach((item, index) => {

        const element =
            document.createElement("div");

        element.className =
            "inventoryItem";


        element.innerHTML = `
            <div class="inventoryItemIcon">
                ◈
            </div>

            <div>
                <strong>
                    ${escapeHTML(item.name)}
                </strong>

                <span>
                    PURCHASE #${index + 1}
                </span>
            </div>
        `;


        inventoryList.appendChild(element);

    });

}


/* -----------------------------
   SECURITY
----------------------------- */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* -----------------------------
   STARTUP
----------------------------- */

updateCredits();

renderInventory();


/* -----------------------------
   KEYBOARD
----------------------------- */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            notification.classList.remove(
                "show"
            );

        }

    }
);
