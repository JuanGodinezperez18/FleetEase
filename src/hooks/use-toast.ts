
"use client";

import * as React from "react";
import { ToastContext, type ToastContextType } from "@/contexts/toast-context";

export const useToast = (): ToastContextType => {
    const context = React.useContext(ToastContext);

    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }

    return context;
};
