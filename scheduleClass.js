class Schedule { //class declaration
    constructor(name){ //class constructor and variables
        this._name = name;
        const tasks = [];
    }
    //Accessor Functions for the schedule objects
    get name(){ //Get function for object name
        return this._name;
    }

    set name(name){ //Set function for object name
        this._name = name;
    }

    get task(){ //Get function for the tasks objects hold
        for(i = 0; i < this.tasks.length; i++){
            return tasks[i];
        }
    }

    set task(newTask){ //Set function for the tasks objects
        tasks.push([newTask]);      
    }
}
//exporting the module
module.exports = Schedule; 