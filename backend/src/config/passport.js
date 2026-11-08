import "./loadEnv.js"
import passport from "passport"
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import prisma from "./prisma.js";

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

// Only verified accounts may use protected routes, whatever token they hold.
export const verifyJwtPayload = async (payload, done) => {
    try {
        const user = await prisma.user.findUnique({where: {id: payload.id}});
        if (!user || !user.Verified) return done(null, false);
        return done(null, user);
    } catch (err) {
        return done(err, false);
    }
};

passport.use(new JwtStrategy(options, verifyJwtPayload));
    
export default passport;