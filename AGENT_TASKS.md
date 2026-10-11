# Antigravity Task Cookbook

## Analyze a new request
Use:
`/plan <request>`

Before execution the agent should classify the change, inspect current state, identify impacts and required artifacts.

## Ask for design only
"Do not modify source code. Analyze the request, update applicable canonical models, and propose the minimum documents/diagrams required."

## Generate documentation
"Generate the selected documentation views from the canonical models. Do not invent project facts."

## Impact analysis
"Analyze the impact of changing <ID>. Classify downstream artifacts as NONE, REVIEW, or UPDATE. Do not edit."

## Verification
"Audit the implementation against requirements, models, diagrams, API, security, and tests. Do not edit."
