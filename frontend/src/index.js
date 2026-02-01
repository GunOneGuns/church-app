/**
=========================================================
* Material Dashboard 2 React - v2.1.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "App";
import { AuthContextProvider } from "context";
import * as serviceWorkerRegistration from "serviceWorkerRegistration";

// Material Dashboard 2 React Context Provider
import { MaterialUIControllerProvider } from "context";
import { I18nProvider } from "i18n";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <BrowserRouter>
    <AuthContextProvider>
      <MaterialUIControllerProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </MaterialUIControllerProvider>
    </AuthContextProvider>
  </BrowserRouter>
);

serviceWorkerRegistration.register();
