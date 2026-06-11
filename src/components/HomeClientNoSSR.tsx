"use client";

import { useEffect, useState } from "react";
import HomeClient from "@/app/components/HomeClient";

export default function HomeClientNoSSR() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <HomeClient /> : null;
}
