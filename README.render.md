# Deployment to Render.com

This document provides instructions for deploying the Democratic Social Network application to Render.com.

## Prerequisites

1. A Render.com account
2. A Supabase account with a configured project
3. Email service credentials for sending notifications

## Deployment Steps

1. Fork this repository to your GitHub account or push it to a GitHub repository

2. Log in to your Render.com account

3. Click "New" and select "Web Service"

4. Connect your GitHub repository

5. Fill in the following settings:
   - Name: Choose a name for your service
   - Region: Select the region closest to your users
   - Branch: Choose the branch to deploy (usually main)
   - Root Directory: Leave empty if the app is in the root of the repository
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

6. In the "Advanced" section, add the following environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase anon key
   - `EMAIL_USER` - Your email account for sending notifications
   - `EMAIL_PASS` - Your email password or app-specific password

7. Click "Create Web Service"

## Environment Variables

You must set the following environment variables in your Render.com dashboard:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL from the Supabase dashboard |
| `SUPABASE_KEY` | Your Supabase anon key from the Supabase dashboard |
| `EMAIL_USER` | Your email account for sending notifications |
| `EMAIL_PASS` | Your email password or app-specific password |

## Database Setup

Before your application will work correctly, you need to set up the database tables in Supabase:

1. Create the required tables by running the SQL commands in `booking_leads_setup.sql`
2. Set up Row Level Security (RLS) policies as needed

## Post-Deployment Configuration

After deployment, you may want to:

1. Set up a custom domain in the Render dashboard
2. Configure autoscaling settings
3. Set up health checks
4. Configure logging and monitoring

## Troubleshooting

If you encounter issues:

1. Check the logs in the Render dashboard
2. Verify that all environment variables are set correctly
3. Ensure that your Supabase credentials are correct
4. Confirm that your database tables have been created
5. Check that your email service credentials are correct

## Updating Your Deployment

To update your deployed application:

1. Push changes to your GitHub repository
2. Render will automatically deploy the new version
3. You can also manually trigger a deployment from the Render dashboard