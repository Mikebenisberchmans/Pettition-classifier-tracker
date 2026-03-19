from utils import load_data,load_model

df=load_data(r"C:\Users\benij\ds_project\Ai_pettition_project\backend\data\petition_dataset.csv")
print(df)
model=load_model(r"C:\Users\benij\ds_project\Ai_pettition_project\backend\models\svc_model_v2.pickle")
print(model)