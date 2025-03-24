import Image from "next/image";

interface FeatureProps {
    title: string;
    image: string;
    description: string;
}

export default function FeatureCard({ title, image, description }: FeatureProps) {
    return (
        <div className="feature text-center md:w-1/3 flex flex-col justify-center">
            <Image
                src={image}
                alt={title}
                width={85}
                height={85}
                priority
                className="mx-auto mb-4 h-auto"
            />
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    )
}