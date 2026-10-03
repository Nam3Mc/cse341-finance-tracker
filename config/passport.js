import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'users';

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!ObjectId.isValid(id)) {
      return done(null, false);
    }
    const user = await getDb()
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const users = getDb().collection(COLLECTION);
        const email = profile.emails?.[0]?.value?.toLowerCase().trim();

        let user = await users.findOne({ googleId: profile.id });

        if (!user && email) {
          user = await users.findOne({ email });
          if (user) {
            await users.updateOne(
              { _id: user._id },
              { $set: { googleId: profile.id, updatedAt: new Date() } }
            );
            user.googleId = profile.id;
          }
        }

        if (!user) {
          const now = new Date();
          const doc = {
            googleId: profile.id,
            email,
            displayName: profile.displayName || 'Google User',
            preferredCurrency: 'USD',
            password: null,
            createdAt: now,
            updatedAt: now,
          };
          const result = await users.insertOne(doc);
          user = { ...doc, _id: result.insertedId };
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;