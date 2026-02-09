'use client'

import { motion } from "framer-motion";
import Image from "next/image";
import Ribbon from "@/public/images/icon_ribbon.svg";
import Chef from "@/public/images/icon_chef.svg";
import Share from "@/public/images/icon_share.svg";
import Phone from "@/public/images/icon_phone.svg";

interface FeatureProps {
    icon: string;
    title: string;
    description: string;
    index: number;
    color: string;
}

export default function FeatureCard({ icon, title, description, index }: FeatureProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
            className="p-4 md:p-10"
        >
            <div className="flex flex-col items-center text-center">
                <div className={`mb-3 flex items-center justify-center`}>
                    {icon === "ribbon" && (
                        <Image src={Ribbon} alt="Save Recipes" className="h-[120px]" />
                    )}
                    {icon === "chef" && (
                        <Image src={Chef} alt="Save Recipes" className="h-[120px]" />
                    )}
                    {icon === "share" && (
                        <Image src={Share} alt="Save Recipes" className="h-[120px]" />
                    )}
                    {icon === "phone" && (
                        <Image src={Phone} alt="Save Recipes" className="h-[120px]" />
                    )}
                </div>
                <h3 className={`text-3xl font-semibold mb-4 text-green`}>
                    {title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                    {description}
                </p>
            </div>
        </motion.div>
    )
}