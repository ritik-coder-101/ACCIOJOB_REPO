const mongoose=require('mongoose');

const sessionSchema=new mongoose.Schema({
    userId: { 
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        require : true
    },
    chatHistory: {
        type : Array,
        default : []
    },

    generatedCode: {
        type : Object,
        default:{}
    },
    uiEditorState: {
        type: Object,
        default:{}
    },
},{
    timestamps:true 
});

sessionSchema.index({userId: 1});
module.exports=mongoose.model('Session',sessionSchema);