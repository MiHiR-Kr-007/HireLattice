import { ErrorTemplate } from "@/components/ui/error-template";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
    return (
        <ErrorTemplate
            errorCode="403"
            title="Access Restricted"
            description="Hold on! You don't have the necessary clearance to enter this area. Please return to your designated dashboard."
            imageSrc="/images/403.png"
            imageAlt="Security guard stopping entry to vault"
            Icon={ShieldAlert}
            themeClass="text-destructive bg-destructive/10"
        />
    );
}
