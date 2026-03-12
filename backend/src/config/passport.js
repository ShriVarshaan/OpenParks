import passport from "passport"
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import prisma from "./prisma";

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(options, async (payload, done) => {
    try {
        const user = await prisma.user.findUnique({where: {id: payload.id}});
        if (!user) return done(null, false);
        return done(null, user);
    } catch (err) {
        return done(err, false);
    }
}));
    
export default passport;