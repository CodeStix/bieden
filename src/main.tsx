import React from "react";
import ReactDOM from "react-dom/client";
import { GamePage } from "./GamePage.tsx";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { BrowserRouter, Route, Routes } from "react-router";
import { HomePage } from "./HomePage.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Theme appearance="dark">
            <BrowserRouter>
                <Routes>
                    <Route path="/" Component={HomePage} />
                    <Route path="/play" Component={GamePage}></Route>
                </Routes>
            </BrowserRouter>
        </Theme>
    </React.StrictMode>
);

serviceWorkerRegistration.register();

