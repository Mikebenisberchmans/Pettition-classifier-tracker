import pandas as pd
import pickle
import sklearn

# method to load data
def load_data(url:str)->pd.core.frame.DataFrame:
    data=pd.read_csv(url)
    data['paragraph']=data['paragraph'].str.lower()
    return data
# method to load model
def load_model(url:str)->sklearn.svm._classes.SVC:
    with open(url,"rb") as file:
        model=pickle.load(file)
    return model