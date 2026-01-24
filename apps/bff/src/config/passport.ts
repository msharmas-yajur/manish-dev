import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { pgPool } from './database';
import { config } from './env';
import { logger } from './logger';

export interface GoogleUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  role: string;
  authProvider: string;
}

export function configurePassport() {
  // Only configure Google OAuth if credentials are provided
  if (!config.google.clientId || !config.google.clientSecret) {
    logger.warn('Google OAuth credentials not configured. Google login will be disabled.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: GoogleUser | false) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profilePicture = profile.photos?.[0]?.value || null;

          if (!email) {
            logger.error('Google OAuth: No email found in profile');
            return done(null, false);
          }

          // Check if user exists by Google ID
          let result = await pgPool.query(
            'SELECT id, email, first_name, last_name, profile_picture, role, auth_provider FROM users WHERE google_id = $1',
            [googleId]
          );

          let user: GoogleUser;

          if (result.rows.length > 0) {
            // Existing Google user - update profile picture if changed
            user = {
              id: result.rows[0].id,
              email: result.rows[0].email,
              firstName: result.rows[0].first_name,
              lastName: result.rows[0].last_name,
              profilePicture: result.rows[0].profile_picture,
              role: result.rows[0].role,
              authProvider: result.rows[0].auth_provider,
            };

            // Update profile picture if changed
            if (profilePicture && profilePicture !== user.profilePicture) {
              await pgPool.query(
                'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
                [profilePicture, user.id]
              );
              user.profilePicture = profilePicture;
            }

            logger.info({ userId: user.id, email: user.email }, 'Google user logged in');
          } else {
            // Check if user exists by email (might have registered with password)
            result = await pgPool.query(
              'SELECT id, email, first_name, last_name, profile_picture, role, auth_provider FROM users WHERE email = $1',
              [email]
            );

            if (result.rows.length > 0) {
              // Link Google account to existing user
              await pgPool.query(
                'UPDATE users SET google_id = $1, profile_picture = COALESCE(profile_picture, $2), auth_provider = CASE WHEN auth_provider = $3 THEN $3 ELSE $4 END, updated_at = NOW() WHERE email = $5',
                [googleId, profilePicture, 'local', 'google', email]
              );

              user = {
                id: result.rows[0].id,
                email: result.rows[0].email,
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                profilePicture: profilePicture || result.rows[0].profile_picture,
                role: result.rows[0].role,
                authProvider: 'google',
              };

              logger.info({ userId: user.id, email: user.email }, 'Linked Google account to existing user');
            } else {
              // Create new user
              const insertResult = await pgPool.query(
                `INSERT INTO users (email, google_id, first_name, last_name, profile_picture, role, auth_provider)
                 VALUES ($1, $2, $3, $4, $5, 'user', 'google')
                 RETURNING id, email, first_name, last_name, profile_picture, role, auth_provider`,
                [email, googleId, firstName, lastName, profilePicture]
              );

              user = {
                id: insertResult.rows[0].id,
                email: insertResult.rows[0].email,
                firstName: insertResult.rows[0].first_name,
                lastName: insertResult.rows[0].last_name,
                profilePicture: insertResult.rows[0].profile_picture,
                role: insertResult.rows[0].role,
                authProvider: insertResult.rows[0].auth_provider,
              };

              logger.info({ userId: user.id, email: user.email }, 'New Google user registered');
            }
          }

          return done(null, user);
        } catch (error) {
          logger.error({ error }, 'Google OAuth error');
          return done(error as Error);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as GoogleUser).id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const result = await pgPool.query(
        'SELECT id, email, first_name, last_name, profile_picture, role, auth_provider FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return done(null, false);
      }

      const user: GoogleUser = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        profilePicture: result.rows[0].profile_picture,
        role: result.rows[0].role,
        authProvider: result.rows[0].auth_provider,
      };

      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  logger.info('Google OAuth configured successfully');
}

export default passport;
