const mongoose=require('mongoose');

const sessionSchema=new mongoose.Schema({
    userId: { 
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        require : true
    },
    chatHistory: {
        //this will store an array of chat message object.
        type : Array,
        default : []
    },

    generatedCode: {
        //this will store the generate jsx/tsx and css.
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