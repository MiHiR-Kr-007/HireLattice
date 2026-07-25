import { ErrorTemplate } from "@/components/ui/error-template";
import { Cone } from "lucide-react";

export default function MaintenancePage() {
    return (
        <ErrorTemplate
            errorCode="503"
            title="Under Maintenance"
            description="We are currently doing some heavy lifting behind the scenes to improve your experience. We'll be back shortly!"
            imageSrc="/images/503.png"
            imageAlt="Maintenance worker with a construction cone"
            Icon={Cone}
            themeClass="text-primary bg-primary/10"
        />
    );
}
