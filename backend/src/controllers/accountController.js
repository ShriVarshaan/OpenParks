import prisma from "../config/prisma.js"

export const getUser = async (req, res) => {
    try {
        const response = await prisma.user.findUnique({where: {id: Number(req.user.id)}})
        if (!response){
            return res.status(404).json({message: "User not found"})
        }
        return res.status(200).json(response)
    }catch (err){
        return res.status(500).json(err)
    }
}

export const deleteUser = async (req, res) => {
    try{
        await prisma.user.delete({where: {id: Number(req.user.id)}})
        return res.status(200).json({message: "Account deleted"})
    }catch (err){
        return res.status(500).json(err)
    }
}