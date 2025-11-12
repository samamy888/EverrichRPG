namespace EverrichRpg.Server.Services;

public interface ILogSink
{
    void Write(object logObject);
}

