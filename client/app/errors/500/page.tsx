"use client";

import { ErrorTemplate } from "@/components/ui/error-template";
import { ServerCrash } from "lucide-react";

export default function ServerErrorPage() {
    return (
        <ErrorTemplate
            errorCode="500"
            title="Server Malfunction"
            description="Our servers just blew a fuse! We're already working on fixing it. Please try again in a few moments."
            imageSrc="/images/500.png"
            imageAlt="Character trying to fix a broken server"
            Icon={ServerCrash}
            themeClass="text-destructive bg-destructive/10"
        />
    );
}
