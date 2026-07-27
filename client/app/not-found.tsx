"use client";

import { ErrorTemplate } from "@/components/ui/error-template";
import { Map } from "lucide-react";

export default function NotFound() {
    return (
        <ErrorTemplate
            errorCode="404"
            title="Lost in the Pipeline"
            description="We searched high and low, but we couldn't find the page you were looking for. It might have been moved or deleted."
            imageSrc="/images/404.png"
            imageAlt="Lost character with a map"
            Icon={Map}
            themeClass="text-primary bg-primary/10"
        />
    );
}
