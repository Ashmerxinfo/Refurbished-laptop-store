/* =====================================
   ASMERIX - GLOBAL LOADING FUNCTION
===================================== */

(function () {

    // Inject Loading CSS
    const style = document.createElement("style");

    style.textContent = `
        #globalLoader {
            position: fixed;
            inset: 0;
            background: rgba(10, 20, 40, 0.72);
            backdrop-filter: blur(7px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 999999;
        }

        .loader-card {
            width: 230px;
            padding: 30px 20px;
            background: #ffffff;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 15px 50px rgba(0,0,0,0.2);
        }

        .loader-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            animation: loaderSpin 0.8s linear infinite;
            margin: 0 auto 18px;
        }

        .loader-title {
            font-size: 16px;
            font-weight: 700;
            color: #172554;
            margin-bottom: 7px;
        }

        .loader-message {
            font-size: 12px;
            color: #64748b;
        }

        @keyframes loaderSpin {
            to {
                transform: rotate(360deg);
            }
        }
    `;

    document.head.appendChild(style);

    // Create Loader HTML
    const loader = document.createElement("div");

    loader.id = "globalLoader";

    loader.innerHTML = `
        <div class="loader-card">
            <div class="loader-spinner"></div>
            <div class="loader-title">Please Wait</div>
            <div class="loader-message">
                Processing your request...
            </div>
        </div>
    `;

    document.addEventListener("DOMContentLoaded", function () {
        document.body.appendChild(loader);
    });

    // Global Loading Functions
    window.AppLoader = {

        show: function (message = "Processing your request...") {

            const element = document.getElementById("globalLoader");

            if (!element) return;

            element.querySelector(".loader-message").textContent = message;

            element.style.display = "flex";
        },

        hide: function () {

            const element = document.getElementById("globalLoader");

            if (!element) return;

            element.style.display = "none";
        }

    };

})();