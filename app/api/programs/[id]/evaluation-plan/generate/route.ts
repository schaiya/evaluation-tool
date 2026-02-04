import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { indicators, startDate, endDate, durationMonths } = await request.json()

    console.log("[v0] Generating evaluation plan for", indicators.length, "indicators")

    const BATCH_SIZE = 10
    const batches = []
    for (let i = 0; i < indicators.length; i += BATCH_SIZE) {
      batches.push(indicators.slice(i, i + BATCH_SIZE))
    }

    console.log(`[v0] Processing ${batches.length} batches of up to ${BATCH_SIZE} indicators each`)

    const allPlanItems = []

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`[v0] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} indicators)`)

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an expert in program evaluation planning. You provide detailed, practical data collection plans.",
            },
            {
              role: "user",
              content: `Create a detailed data collection plan for the following indicators.

Evaluation Period: ${startDate} to ${endDate} (${durationMonths} months)

Indicators (Batch ${batchIndex + 1}/${batches.length}):
${batch
  .map(
    (ind: any, idx: number) => `${idx + 1}. [ID: ${ind.id}] ${ind.indicator_text}
   Metric: ${ind.metric || "Not specified"}
   Data Source: ${ind.data_source || "Not specified"}`,
  )
  .join("\n\n")}

For each indicator, determine:
1. Collection method (specific approach - e.g., "Online survey via Google Forms", "Semi-structured interviews", "Focus groups", "Administrative data extraction")
2. Timeline (when to collect - e.g., "Baseline (Month 1)", "Midpoint (Month ${Math.floor(durationMonths / 2)})", "Endline (Month ${durationMonths})", "Quarterly", "Monthly")
3. Frequency (how often - e.g., "Once", "Monthly", "Quarterly", "Bi-annually", "Continuously")

Consider:
- Baseline, midpoint, and endline measurements for outcomes
- Ongoing monitoring for activities and outputs
- Appropriate timing for different types of data
- Practical feasibility of data collection

CRITICAL: You MUST return EXACTLY ${batch.length} plan items, one for each indicator above. Do not skip any indicators. Every indicator ID must appear in your response.

Return a JSON object with a "plan" property containing an array of objects with this structure:
{
  "plan": [
    {
      "indicator_id": "uuid",
      "indicator_text": "text",
      "metric": "metric",
      "data_source": "source",
      "collection_method": "specific method",
      "timeline": "when to collect",
      "frequency": "how often"
    }
  ]
}

Be specific and practical about timing and methods.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 6000,
        }),
      })

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        console.error("[v0] OpenAI API error:", errorText)
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`)
      }

      const openaiData = await openaiResponse.json()
      console.log(`[v0] OpenAI response received for batch ${batchIndex + 1}`)

      const content = openaiData.choices[0].message.content
      console.log(`[v0] Response length: ${content.length} characters`)

      let parsedResponse
      try {
        parsedResponse = JSON.parse(content)
      } catch (parseError) {
        console.error("[v0] Failed to parse OpenAI response:", content.substring(0, 500))
        throw new Error("Failed to parse AI response as JSON")
      }

      let planItems = []
      if (Array.isArray(parsedResponse)) {
        planItems = parsedResponse
      } else if (parsedResponse.plan) {
        planItems = parsedResponse.plan
      } else if (parsedResponse.planItems) {
        planItems = parsedResponse.planItems
      } else if (parsedResponse.data) {
        planItems = parsedResponse.data
      } else if (parsedResponse.items) {
        planItems = parsedResponse.items
      } else {
        const arrayProp = Object.keys(parsedResponse).find((key) => Array.isArray(parsedResponse[key]))
        if (arrayProp) {
          planItems = parsedResponse[arrayProp]
        }
      }

      console.log(`[v0] Parsed ${planItems.length} plan items for batch ${batchIndex + 1} (expected ${batch.length})`)

      const batchIndicatorIds = new Set(batch.map((ind: any) => ind.id))
      const batchPlannedIds = new Set(planItems.map((item: any) => item.indicator_id))
      const missingInBatch = Array.from(batchIndicatorIds).filter((id) => !batchPlannedIds.has(id))

      if (missingInBatch.length > 0) {
        console.warn(`[v0] Batch ${batchIndex + 1}: Missing ${missingInBatch.length} indicators. Adding defaults.`)
        const missingIndicators = batch.filter((ind: any) => missingInBatch.includes(ind.id))
        for (const ind of missingIndicators) {
          planItems.push({
            indicator_id: ind.id,
            indicator_text: ind.indicator_text,
            metric: ind.metric || "To be determined",
            data_source: ind.data_source || "To be determined",
            collection_method: "To be specified",
            timeline: `Throughout program (Months 1-${durationMonths})`,
            frequency: "To be determined",
          })
        }
        console.log(`[v0] After adding defaults: ${planItems.length} plan items in batch ${batchIndex + 1}`)
      }

      allPlanItems.push(...planItems)
    }

    console.log(`[v0] Total plan items generated: ${allPlanItems.length}`)
    console.log(`[v0] Expected: ${indicators.length}, Generated: ${allPlanItems.length}`)

    if (allPlanItems.length !== indicators.length) {
      console.error(
        `[v0] MISMATCH: Generated ${allPlanItems.length} plan items but have ${indicators.length} indicators`,
      )
    }

    return NextResponse.json({ planItems: allPlanItems })
  } catch (error) {
    console.error("[v0] Error generating evaluation plan:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate evaluation plan" },
      { status: 500 },
    )
  }
}
