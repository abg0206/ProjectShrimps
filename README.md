# This document includes the Documentation for A. AI Context Documents S1-001, S1-002, S1-003, S1-004

# Engineering Coding Standards

## Purpose

This document defines the coding standards for contributors and AI-generated code

## Naming Conventions

Components: PascalCase  
Functions: PascalCase  
Variables: camelCase  
Constants: camelCase  
Database Tables: PascalCase

## Folder Structure

**2 level directory**

/frontend  
/ats-frontend  
/src, /public  
App.css, App.tsx assets components custom.d.ts index.css layout lib main.tsx pages

/backend
/controllers middleware node_modules package.json routes sql
config models package-lock.json server.js

## Formatting Rules

ESLint for linting  
Prettier for formatting  
No unused variables  
No console.log statements in production code

## Error Handling

Return meaningful error messages

## API Response Format

method: 'POST',  
headers: { 'Content-Type': 'application/json' },  
body: JSON.stringify({  
title: newTitle.trim(),  
company: newCompany.trim(),  
description: newDescription.trim(),  
}),

## Security Requirements

Protected routes require authentication  
User ownership checks are enforced server-side  
Never trust frontend authorization checks

# UI/UX Standards

## Navigational Model

**Sprint 1 navigation includes:**  
Dashboard  
Profile  
Settings

## Dashboard Interaction Model

**Dashboard is the primary workspace where users should be able to:**  
View jobs  
Create jobs  
Edit jobs

## Component Standards

Reusable components are preferred  
Forms use consistent validation patterns  
Buttons have a consistent look/appearance

## Typography

Consistent heading hierarchy  
Clear page titles  
Readable body text

## Spacing

Consistent margins and padding  
Uniform spacing  
Consistent form layout

## Accessibility

Labels for all form fields  
Error messages displayed clearly

## Consistency Rules

Similar actions behave similarly  
Forms share common style  
Navigation behaves consistently across different pages

# Data and Security Guardrails

## Authentication

All protected routes require authentication  
Unauthenticated users are denied access

## Data Ownership

Every record belongs to exactly one user  
**Ex:**  
Jobs belong to one user  
Profiles belong to one user  
Authorization Rules  
**<u>Users are allowed to:</u>**  
Read their own data  
Update their own data  
**<u>User are NOT allowed to:</u>**  
Read another user’s data  
Modify another user’s data  
Delete another user’s data

## Backend Enforcement

Ownership checks occur on the server  
Frontend checks alone are not sufficient

## Protected Routes

Dashboard, Profile, Settings  
Protected APIs require authentication

## Prohibited Patterns

Querying user records without filtering ownership  
Trusting user-supplied owner IDs  
Returning another user’s data  
Disabling authorization checks

## Testing Requirements

**Tests must verify:**  
User A can access User A data  
User A is not able to access User B data

# AI-Generated Code

## Purpose

AI tools may be used to help in assisting development, but all generated code must meet project standards and be reviewed by human before merging

## Approved AI Tools

Claude for debugging

## Prompt Standards

Prompts include relevant user story requirements  
Prompts should include accepted criteria when available  
Developers should test along with implementation  
Prompts must not contain personal data, passwords, API keys, secrets, or production credentials

## Developer Responsibility

Developers are responsible for all AI-generated code  
Code must be understood by developers before submission  
Developers are not allowed to blame AI for defects “The AI generated that”  
Generated code must be modified if it does not follow project standards

## Security Restrictions

**<u>AI-generated code must:</u>**  
Enforce authentication requirements  
Enforce server-wide authorization  
Respect data ownership rules  
Validate user input  
Prevent cross-user data access  
**<u>AI-generated code must not:</u>**  
Bypass authentication checks  
Disable authorization logic  
Trust client-provided ownership information  
Expose sensitive data

## Human Review

**<u>Before a merge:</u>**  
Team member reviews code  
The reviewer verifies compliance with coding standards, UI/UX standards, security guardrails

## Testing

**<u>AI-generated code must include:</u>**  
At least one happy-path and negative-path test  
Validation and authorization tests where applicable  
**<u>Authentication stories must include:</u>**  
Invalid login tests  
Unauthorized access tests

## Approval

**<u>AI-generated code may not be merged unless:</u>**  
Build passes  
Unit tests pass  
**<u>A pull request may be merged when:</u>**

1. Human review is complete
2. Required tests exist
3. No known security violations exist

## Accountability Statement

Human developers are responsible for all code committed to the repository regardless of whether the code was written manually or AI-generated
abc