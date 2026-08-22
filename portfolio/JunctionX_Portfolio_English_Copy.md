# JunctionX Portfolio - English Copy

Source: `/Users/miro/Downloads/고기범_Portfolio.pdf`  
Purpose: English replacement copy for all 19 portfolio pages.

## Global conventions

- Use `Gibeom Ko` for `고기범`.
- Use `JunctionX Korea 2026`, not `JUNCTION X Korea 2026`.
- Recommended running header: `2026 Portfolio | JunctionX Korea 2026`
- Keep the product name `medISON` exactly as branded.
- Use `End-to-End`, `SwiftUI`, `BLE`, `Embedded Systems`, and `Product Engineering` consistently.
- Replace `Lesson Learn` with `Lessons Learned`.
- Replace `Interation` with `Interaction`.
- Replace `Import` with `Category`.
- English text is often wider than Korean. The copy below is intentionally concise, but text boxes may still need minor resizing.

---

# Page 1 - Resume

## Headings and personal information

- `Resume`
- `Gibeom Ko`
- `Birth` -> `Date of Birth`
- `Experience` -> `Experience`
- `Education` -> `Education`
- `Activities` -> `Activities`
- `Contact` -> `Contact`
- `Career` -> `Experience`
- `Projects` -> `Selected Projects`
- `Awards` -> `Awards`
- `Tools` -> `Tools`

## Education

- `Suseong High School - Graduated`
- `Dongguk University - B.S. in Electrical and Electronic Engineering`
- `Completed sophomore year; currently on leave`

## Activities

- `2026 Cohort, Apple Developer Academy @ POSTECH`

## Experience

- `2019-Present | Freelance Visual Designer & Developer`
- `2023 | Math Academy Teaching Assistant`
- `Planned and developed an academy management solution`

## Selected Projects

### UrbanEase | 2025

Expanded the 2022 Ttota Subway boarding-assistance concept into a city-connected public transportation service designed with barrier-free mobility in mind.

### CareBridge | 2025

Designed an accessible healthcare solution that helps vulnerable users, including older adults living alone, find and use medical services more easily.

### medISON | 2024

Designed an age-inclusive medication search experience using image recognition and generative AI.

### Speed Parking | 2023

Designed an AI-assisted parking allocation concept that reduces the difficulty of finding available spaces and recommends spots based on user preferences.

### Ttota Subway Boarding Assistance | 2022

Designed an automated safety platform to prevent gap-related boarding accidents and support passengers with reduced mobility.

### Social Connection Program for Older Adults Living Alone | 2022

Conceptualized a social discovery service that helps older adults living alone find companions and reduce social isolation.

## Awards and activities

- `2026 | Excellence Award, Daejeon Social Problem-Solving Ideathon`
- `2025 | Impact Award, Prography Profitlab Hackathon`
- `2025 | APEX Creative Problem-Solving Project, Dongguk University`
- `2025 | Team Lead, AirSquare Startup Club, Dongguk University`
- `2024 | Top 50, Defense Startup Competition`
- `2024 | Creativity Award, Republic of Korea Air Force Startup Competition`
- `2023 | Grand Prize, Dongguk University LINC+ IoT Hackathon`
- `2023 | Excellence Award, Starterthon, Dongguk University Startup Education Center`
- `2022 | Excellence Award, Dongguk University MARU Making Camp`

## Tools

- `Illustrator | 80%`
- `Photoshop | 65%`
- `Figma | 80%`

> Review note: `10 years of experience` may invite questions when paired with a 2003 birth year. Keep it only if the start point and meaning are defensible.

---

# Page 2 - Work Process

## Title

`Work Process`

## Introduction

I define the problem, then test the riskiest technical assumption first.

I design the data flow, connect the core functionality End-to-End, and verify that the result is reproducible in a real environment.

## Timeline

- `START`
- `Align on Goals`
- `01 Define the Problem and User`
- `02 Validate Core Assumptions`
- `03 Design the System and Data Flow`
- `04 Build End-to-End`
- `05 Validate in the Real Environment`
- `Document`
- `DONE`

## Supporting principles

### Understand the Real-World Context

I investigate where the problem occurs and how users currently handle it. Before choosing a technology, I define the essential action the product must support.

### Test the Riskiest Assumption First

I validate unfamiliar APIs, communication methods, and external services through the smallest possible experiment.

### Separate Data Flow and Responsibilities

I map the flow of input, processing, storage, and output, then define each component's responsibilities, state changes, and fallback paths.

### Connect the Core Flow First

Instead of expanding individual features, I first complete the smallest flow that allows the user's core action to work from start to finish.

### Validate Repeatedly in the Real Environment

A successful build is not completion. I test normal and failure cases with real devices and data, then verify that the same result can be reproduced.

---

# Page 3 - Engineering Profile

## Labels

- `Project Type`
- `Product Engineering`
- `2023-2025`
- `Selected Projects`
- `Focus`
- `Product & Software`

## Main title

`Mobile & System Engineering`

## Introduction

I structure incomplete user input into verifiable outcomes.

I connect mobile apps, AI, data, and hardware into one coherent user flow, then validate feasibility through working prototypes.

## Project list

- `2025 | AI-Assisted Early Disease Detection Service [CareBridge]`
- `2024 | Intelligent Medication Recognition Service [medISON]`
- `2023 | AI Parking Management Service [Speed Parking]`

---

# Page 4 - medISON Overview

## Title

`An Intelligent Medication Search Service Using Image Recognition and Generative AI`

`medISON`

## Summary

Designed a service that lets users identify unfamiliar medication through images, QR codes, or natural-language questions and share recent medication records in emergencies.

## Project information

- `Team | E-um / Startup`
- `Role | Team Lead - Product & Software`
- `Period | Dec 2023-Aug 2024 (9 months)`
- `Technology | OCR - Image Recognition - GPT-4o - QR - Mobile Prototype`

## Phone mockup

- `Back`
- `Image Scan`
- `Confirm`
- `Place a medicine package or prescription QR code inside the frame.`

---

# Page 5 - medISON Background and Problem

## Background

Medication information exists in public databases and on prescription bags, but users often do not know the exact product name when they need to identify a pill.

The clues available to them may be limited to the pill's color, shape, imprint, a QR code, or an incomplete memory.

## Problem 01 - Search Requires the Exact Drug Name

Most medication search services assume that users already know the product or ingredient name. When the pill itself is unknown, users do not know where to begin.

## Problem 02 - User Clues Do Not Match the Search Interface

Users may have a pill image, color, shape, imprint, or prescription QR code. A single text search field cannot effectively use these different forms of input.

## Problem 03 - The Boundary Between Candidates and Confirmed Information Is Unclear

Many pills look alike. Identifying a specific drug from one image can lead to misidentification, so the service must present candidates and ask the user to confirm.

## Problem 04 - Medication Context Is Lost in Emergencies

When a patient is unconscious or unable to explain their condition, it is difficult to communicate recent medications and basic health information immediately.

## System diagram labels

- `Patient / Caregiver`
- `Image, QR Code, or Question`
- `Candidate Drugs with Supporting Evidence`
- `medISON`
- `Retrieve Candidates Using Extracted Conditions`
- `Candidates, Ingredients, and Precautions`
- `Official Medication Information`
- `Medication Data`
- `Emergency Responder`
- `User`
- `Server`

## Delete these leftover template strings

The following text is unrelated to medISON and should be removed instead of translated:

- `Create an Excel sheet`
- `Send a screenshot after preparing the sales report`
- `Operations manager overseeing the performance of recruited restaurants`
- Any visible `Problem 1 section`, `Problem 2 section`, and similar template badges should either be removed or simplified to `PROBLEM 01`, `PROBLEM 02`, etc.

---

# Page 6 - medISON Solution

## Title

`We Unified Different Inputs into One Medication Search Flow`

## Section title

`Medication Search Pipeline`

## Column headings

- `Input Channels`
- `Unified Search`
- `User-Facing Results`

## Image path

- `Image Scan`
- `Image Preprocessing`
- `Extract Color, Shape, and Imprint`
- `OCR + Visual Features`

## QR path

- `QR Scan`
- `Parse QR Data`
- `Extract Prescription Identifier`

## Natural-language path

- `Natural-Language Question`
- `Analyze User Intent`
- `Structure Search Criteria`

## Search path

- `Structured Search Criteria`
- `Retrieve and Match Candidate Drugs`
- `Query Official Medication Data`
- `Structure Results`

## Result path

- `Compare Candidate Drugs`
- `Ingredients - Indications - Precautions`
- `Show Sources and Supporting Evidence`
- `User Confirmation`
- `Save Medication Record`

## Information fields

- `Product Name`
- `Ingredient`
- `Appearance`
- `Indications`
- `Precautions`
- `Korea Pharmaceutical Information Center Database`

## Callouts

### Point 1

Image, QR, and natural-language inputs are normalized into the same structured search criteria.

### Point 2

Generative AI interprets the input and explains the result, while official medication data remains the source of truth.

### Point 3

Instead of asserting a single answer, the system presents candidates and supporting evidence so the user can confirm.

## MedShare path

- `User Consent`
- `Select Minimum Necessary Information`
- `MedShare`

---

# Page 7 - medISON Journey Map

## Title

`Journey Map`

## Persona

- `Age | Mid-20s to early 40s`
- `Profile | Urban residents currently taking one or more prescription medications`
- `Needs | An intuitive and practical experience`
- `Needs | Smart search with minimal manual input`
- `Needs | Easy access to current medication information`

## Persona description

The journey map helped us understand the experiences and emotions users encounter throughout the service. We identified friction points and translated them into concrete product improvements.

## Stages

### 01 Awareness

- `Action | Sees an advertisement while browsing social media or the web`
- `Thought | "I want to identify this unfamiliar pill right now."`
- `Emotion | Desire to find the information immediately`
- `Need | Benefit-led messaging and easily accessible information`

### 02 Search

- `Action | Tries multiple ways to find medication information`
- `Thought | "Entering every pill characteristic manually is frustrating."`
- `Thought | "How much and when was I supposed to take this?"`
- `Emotion | Expectation of a fast, accurate search`
- `Emotion | Concern about making the wrong choice`
- `Need | Trustworthy information and useful content`

### 03 Evaluation

- `Action | Tests the free search feature and evaluates its usefulness`
- `Thought | "Can one photo really identify this pill?"`
- `Thought | "Is there a service that lets me search by photo?"`
- `Emotion | Satisfaction from discovering new information`
- `Emotion | Concern about inaccurate information`
- `Need | Detailed information and easy access to the core feature`

### 04 Purchase

- `Action | Decides to use the service and purchases or subscribes`
- `Thought | "Will the search work reliably?"`
- `Thought | "Searching is useful, but how should I take this medicine?"`
- `Emotion | Difficulty choosing among several options`
- `Emotion | Concern that inaccurate information could cause harm`
- `Need | Fast, intuitive search and clearly cited trusted sources`

### 05 Use and Retention

- `Action | Uses the paid features regularly`
- `Thought | "Should I keep using this service?"`
- `Thought | "Is the information useful and easy to understand?"`
- `Emotion | Satisfaction with a convenient service`
- `Emotion | Frustration if the product is difficult to use`
- `Need | A clear user guide and accessible customer support`

### 06 Share and Feedback

- `Action | Shares the service with others and encourages them to try it`
- `Thought | "I should leave a review and earn points."`
- `Thought | "This service is genuinely convenient."`
- `Emotion | Enjoyment from sharing feedback`
- `Emotion | Pride in recommending a useful product`
- `Need | Easy sharing and incentives for reviews`

## Touchpoints

- `Social Media and Web Ads`
- `Similar Apps and User Reviews`
- `Free Search Experience`
- `Purchase and Payment`
- `Installation Guide and Customer Support`
- `Sharing and Reviews`

---

# Page 8 - CareBridge Overview

## Labels

- `Project 02`
- `CareBridge`
- `Role | Team Lead`
- `Period | 1 month / Jan 2024-Feb 2024`
- `Tools | Figma, Illustrator, and PowerPoint`

## Concept

Designed an accessible healthcare service for vulnerable users, including older adults living alone.

The experience remains simple for users while generative AI and optimization algorithms work behind the scenes to support a more personalized and efficient service.

---

# Page 9 - CareBridge Key Concept

## Title

`Key Concept`

## Introduction

Designed around immediate access so users can find information as soon as they enter the service.

## Keywords

- `Intuitive`
- `Simple`
- `Light`

## Annotations

- `An at-a-glance service guide on the first screen`
- `Generous whitespace balances the expressive typeface`

## Phone UI

- `How can I help?`
- `I can help with:`
- `Health Information`
- `Symptoms and Possible Causes`
- `Recommended Tests`
- `Warnings and Risk Signals`

---

# Page 10 - Speed Parking Overview

## Labels

- `Project 03`
- `Speed Parking`
- `How It Works`
- `Role | Team Lead`
- `Period | 1 month / Jan 2024-Feb 2024`
- `Tools | Figma, Illustrator, and PowerPoint`

## Process callout

When users register preferred parking characteristics as tags, the matching algorithm prioritizes spaces that meet those preferences.

## Concept

We approached the difficulty of finding available parking from the driver's perspective.

The concept combines an AI-based preference matching algorithm with real-time parking guidance to recommend a suitable space and guide the user to it.

## App UI

- `Welcome`
- `Favorites`
- `Usage History`
- `Payment History`
- `Points`
- `Preferred Space Tags`
- `Edit`
- `Near the Exit`
- `Accessible Parking`
- `Shaded Parking`
- `Near the Store Entrance`
- `Women-Only Parking`
- `Current Parking Recommendation`
- `Browse Nearby Parking`
- `Recharge Valet Credits`

---

# Page 11 - Speed Parking Key Concept

## Title

`Key Concept`

## Introduction

Designed around visual content so users can find information through a direct and concise interface.

## Keywords

- `Interaction`
- `Line`
- `Bold & Light`

## Annotations

- `Preference-based curation`
- `Whitespace improves readability`

> The phone mockup repeats the UI strings from Page 10. Replace those Korean strings with the same English labels for consistency.

---

# Page 12 - Engineering Retrospective

## Recommended title

`Lessons from Failure`

## Labels

- `Project Type | Engineering Retrospective`
- `2022`
- `Cases | 2`
- `Focus | Product & Engineering`

## Introduction

Not every product decision, interface, or implementation went as planned.

These failures were painful, but they exposed gaps in my process and became valuable opportunities to improve. The following cases summarize what went wrong and how they reshaped the way I build.

## Case list

- `Ttota Subway Boarding Assistance System`
- `Social Connection Program for Older Adults Living Alone`

> Recommended: replace `Unyielding Errors`, which sounds unnatural in English, with `Lessons from Failure` or `Engineering Retrospective`.

---

# Page 13 - Ttota Subway Boarding Assistance

## Labels

- `Hardware Development`
- `Project 04`
- `Ttota Subway Boarding Assistance System`
- `2022`
- `Category | Hardware`
- `Contribution | 90%+`

## Description

The Ttota Subway Boarding Assistance System deploys a safety platform to prevent gap-related boarding accidents and support passengers with reduced mobility.

Because opening the platform for every train could disrupt peak-hour operations, we designed an additional mechanism that estimates boarding demand and activates the platform only when needed.

---

# Page 14 - Ttota Subway: What Went Wrong

## Title

`What Went Wrong?`

## Body

I focused on the implementation environment instead of validating the core function, which prevented us from finishing on time.

As team lead, I also assumed that I should handle every difficult task myself. Work that could have been completed faster through delegation was instead carried out inefficiently, and the intended functionality remained incomplete.

The organizers accepted a visible functional prototype, allowing us to achieve a positive result. However, the experience taught me to build the most important function first, delegate based on each member's strengths, and improve the product iteratively.

> Text inside the embedded presentation thumbnails is still Korean. Re-export those thumbnails from an English source deck or remove them; replacing only the surrounding body copy will not produce a fully English PDF.

---

# Page 15 - Ttota Subway: Lessons Learned

## Title

`Lessons Learned`

## Technical lesson

Although the organizers accepted the visible prototype, I learned that a stronger product starts with the most important function and improves through short, repeated iterations.

Visual polish creates value only after the core experience works reliably.

## Collaboration lesson

Leadership does not mean taking every difficult task alone. It means trusting the team, assigning clear ownership, and providing enough guidance for each member to contribute at their best.

---

# Page 16 - Social Connection Program

## Labels

- `Concept Development`
- `Project 05`
- `Social Connection Program for Older Adults Living Alone`
- `2022`
- `Category | Service`
- `Contribution | 80%`

## Description

Designed a social discovery service that helps older adults living alone find conversation partners and friends, reducing social isolation.

Because many users may be unfamiliar with digital services, the concept also includes offline experiences.

## Embedded concept graphic

- `Online Chat`
- `Proactive Matching System`
- `One-to-One Match`
- `In-Person Meetups`
- `One-to-One Experiences with Familiar Devices`

### Online Chat

Users enter details such as age, region, and interests. The matching system uses those preferences to recommend compatible conversation partners.

### In-Person Meetups

Offline programs and familiar devices make it easier for older adults to build relationships beyond the digital experience.

> The blue concept graphic contains Korean text as part of an embedded image. It must be recreated or re-exported in English.

---

# Page 17 - Social Connection Program: What Went Wrong

## Title

`What Went Wrong?`

## Body

With little time for team discussion, I rushed to define the concept before completing enough market research.

As a result, we could not clearly answer who needed the service, how strong the demand was, or how users would actually engage with it.

The pressure to produce a service kept our thinking in circles. We ended with only a broad outline rather than a product with the intended functionality, and the project received completion recognition but no award.

> The large blue concept graphic and the slide thumbnails contain Korean text embedded in images. Replace them with English exports if this page remains in the portfolio.

---

# Page 18 - Social Connection Program: Lessons Learned

## Title

`Lessons Learned`

## Product lesson

The experience taught me to study comparable services before implementation, identify the target user's real needs, and define the product around evidence rather than assumptions.

References should guide the structure of the service, not be copied. They help the team reach a testable product direction faster.

## Collaboration lesson

Choosing one direction does not mean shutting down every alternative. The team should keep discussing other possibilities as new evidence appears.

Sustained exploration makes it more likely that useful and original ideas will emerge when the first approach reaches a limitation.

---

# Page 19 - Closing

## Recommended headline

`A Developer Who Validates Ideas and Turns Them into Working Products - Gibeom Ko`

## Body

I start by understanding users and their environment, then test the riskiest technical assumptions first.

I connect SwiftUI, AI, BLE, and embedded systems to build MVPs with a complete End-to-End flow.

At JunctionX Korea, I will help the team turn an idea into a testable, working outcome within 48 hours.

## Contact

- `kogibeom12@gmail.com`
- `010-2493-4796`

> If the PDF will be publicly distributed, consider replacing the phone number with a GitHub or LinkedIn URL.

---

# Final English QA checklist

- Search the final PDF for Korean Unicode characters; the result should be empty.
- Check text embedded inside phone mockups, diagrams, presentation thumbnails, and blue concept images. PDF text search will not find Korean baked into images.
- Replace every running header with `2026 Portfolio | JunctionX Korea 2026`.
- Confirm `Gibeom Ko`, `medISON`, `CareBridge`, and `Speed Parking` are spelled consistently.
- Confirm `Interaction`, `Lessons Learned`, `Category`, and `Contribution` replace the current template wording.
- Re-export the PDF and visually inspect all 19 pages for overflow, clipped text, and line breaks.
