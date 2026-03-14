import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

const settingsUrl = absoluteUrl("/settings");

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    // 1. Await auth()
    const { userId } = await auth(); 
    const user = await currentUser();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userSubscription = await prismadb.userSubscription.findUnique({
      where: { userId },
    });

    // Billing Portal Logic
    if (userSubscription && userSubscription.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: userSubscription.stripeCustomerId,
        return_url: settingsUrl,
      });

      return new NextResponse(JSON.stringify({ url: stripeSession.url }));
    }

    // Checkout Session Logic
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: settingsUrl,
      cancel_url: settingsUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: user.emailAddresses[0].emailAddress,
      line_items: [
        {
          price_data: {
            currency: "EUR",
            product_data: {
              name: "Omniscient Pro",
              description: "Unlimited AI Generations",
            },
            unit_amount: 2000, // 20.00 EUR
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId, // Critical for your webhook to identify who paid
      },
    });

    return new NextResponse(JSON.stringify({ url: stripeSession.url }));
  } catch (error: any) {
    // THIS LOG IS KEY: Check your terminal for the detailed message
    console.log("[STRIPE_ERROR]", error.message); 
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}