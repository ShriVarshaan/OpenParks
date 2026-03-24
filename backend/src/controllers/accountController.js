import prisma from "../config/prisma.js"

export const getUser = async (req, res) => {
    try {
        const response = await prisma.user.findUnique({where: {id: Number(req.user.id)}})
        res.status(200).json(response)
    }catch (err){
        console.log(err)
    }
}

export const deleteUser = async (req, res) => {
    try{
        await prisma.user.delete({where: {id: Number(req.user.id)}})
        return res.status(200).json({message: "Account deleted"})
    }catch (err){
        console.log(err)
    }
}