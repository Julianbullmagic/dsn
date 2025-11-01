# Democratic Social Network

A democratic social network application with chat, suggestions, and referenda voting system.

## Features

1. **News Feed**: Share posts with the community
2. **Suggestions**: Members can propose issues for discussion
3. **Referenda**: Issues that pass a quorum threshold (5%) move to referenda for voting
4. **User Registration**: New users can register accounts with unique email addresses
5. **Email Verification**: Users must verify their email addresses after registration
6. **Transparent Voting**: Users can see who has voted for and against suggestions and referenda
7. **Admin Elections**: Users can vote for administrators, with the top 3 vote-getters becoming admins
8. **Admin Moderation**: Admins can delete posts, suggestions, referenda, and messages, as well as ban users
9. **Chat System**: Real-time chat with a collapsible chat bar that can be minimized or expanded. The chat includes tabs for general discussion and referendum-specific rooms
10. **Booking Leads**: For entertainer cooperatives - members can post and view booking opportunities

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **Database**: Supabase (with mock implementation included)
- **Authentication**: Supabase Auth (with mock implementation included)
- **Email Notifications**: Nodemailer
- **Hosting**: Can be deployed to any Node.js hosting platform

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`

## Project Structure

```
├── index.html                 # Main HTML file
├── styles.css                 # Styling for the application
├── app.js                     # Frontend JavaScript functionality
├── server.js                  # Node.js server with Socket.IO
├── supabaseClient.js          # Supabase database integration (placeholder)
├── booking_leads_setup.sql    # SQL commands to create booking leads table
├── package.json               # Project dependencies and scripts
└── README.md                  # This file
```

## How It Works

### User Flow

1. **Registration**: New users can register accounts through the registration tab
2. **Email Verification**: After registration, users receive a verification email and must verify their email address
3. **News Feed**: Users can view and post messages to a community news feed
4. **Suggestions**: Users can submit suggestions for issues to be discussed. Each suggestion needs to gather votes.
5. **Quorum System**: Suggestions that reach a 5% quorum are promoted to referenda
6. **Referenda**: Active referenda can be voted on by all members
7. **Transparent Voting**: Users can see the names of all who have voted for or against any suggestion or referendum
8. **Admin Elections**: Users can vote for administrators at any time
9. **Admin Moderation**: Admins have special privileges to delete content and ban users
10. **Chat System**: Users can participate in real-time chat with both general and referendum-specific rooms
11. **Booking Leads**: Users can post and view booking opportunities for entertainment events:
    - Create new leads with date, duration, and description
    - View all available leads sorted by date (newest first)
    - Delete leads they created themselves
    - Admins can delete any lead
    - Leads older than 2 weeks are automatically deleted
    - Email notifications are sent to all users when a new lead is created

## Database Structure

The application uses the following database tables:

1. **users**: Stores user information including username, email, and admin status
2. **posts**: Stores community posts
3. **suggestions**: Stores proposed issues for discussion
4. **referenda**: Stores active and completed referenda
5. **votes**: Stores voting information for suggestions and referenda
6. **admin_votes**: Stores votes for administrators
7. **messages**: Stores chat messages
8. **booking_leads**: Stores booking opportunities for entertainers

## Setup Instructions

1. Follow the instructions in `SUPABASE_SETUP.md` to set up your Supabase database
2. Create the required tables including the new `booking_leads` table:
   - Run the SQL commands in `booking_leads_setup.sql` in your Supabase SQL editor, or
   - Follow the manual instructions in `SUPABASE_SETUP.md`
3. Set up your environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase anon key
   - `EMAIL_USER` - Your email account for sending notifications
   - `EMAIL_PASS` - Your email password or app-specific password

## Deployment

### Render.com

This application can be deployed to Render.com using the provided `render.yaml` configuration file.

1. Fork this repository to your GitHub account
2. Log in to your Render.com account
3. Create a new Web Service and connect it to your repository
4. Set the required environment variables in the Render dashboard:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase anon key
   - `EMAIL_USER` - Your email account for sending notifications
   - `EMAIL_PASS` - Your email password or app-specific password
5. See `README.render.md` for detailed deployment instructions

### Other Platforms

The application can be deployed to any platform that supports Node.js applications. 
Make sure to set the required environment variables and configure the database properly.

## Development Status

This application is currently in active development. Some features are implemented as mockups and need to be connected to real backend services.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.